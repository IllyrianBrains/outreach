#!/usr/bin/env python3
"""Extract named universities and gymnasiums from an Albania OSM PBF."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import subprocess
from pathlib import Path


TAG_RE = re.compile(r'"((?:[^"\\]|\\.)*)"=>"((?:[^"\\]|\\.)*)"')


def parse_tags(value: str | None) -> dict[str, str]:
    if not value:
        return {}
    return {
        key.replace(r'\"', '"').replace(r'\\', '\\'): val.replace(r'\"', '"').replace(r'\\', '\\')
        for key, val in TAG_RE.findall(value)
    }


def read_layer(pbf: Path, layer: str) -> list[dict]:
    if layer == "points":
        fields = "osm_id, NULL AS osm_way_id, name, NULL AS amenity, NULL AS building, other_tags, geometry"
        condition = "other_tags LIKE '%\"amenity\"=>\"university\"%' OR lower(name) LIKE '%gjimnaz%'"
    else:
        fields = "osm_id, osm_way_id, name, amenity, building, other_tags, ST_Centroid(geometry) AS geometry"
        condition = "amenity='university' OR lower(name) LIKE '%gjimnaz%'"
    sql = f"SELECT {fields} FROM {layer} WHERE name IS NOT NULL AND ({condition})"
    command = [
        "ogr2ogr", "-f", "GeoJSONSeq", "/vsistdout/", str(pbf),
        "-dialect", "SQLITE", "-sql", sql, "-lco", "RS=NO",
    ]
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return [json.loads(line) for line in result.stdout.splitlines() if line.strip()]


def point(feature: dict) -> tuple[float, float]:
    geometry = feature["geometry"]
    coords = geometry["coordinates"]
    if geometry["type"] == "Point":
        return coords[0], coords[1]

    points: list[tuple[float, float]] = []

    def collect(item: object) -> None:
        if isinstance(item, list) and len(item) >= 2 and all(isinstance(v, (int, float)) for v in item[:2]):
            points.append((float(item[0]), float(item[1])))
        elif isinstance(item, list):
            for child in item:
                collect(child)

    collect(coords)
    return (
        sum(lon for lon, _ in points) / len(points),
        sum(lat for _, lat in points) / len(points),
    )


def distance_m(a: dict, b: dict) -> float:
    lat = math.radians((a["latitude"] + b["latitude"]) / 2)
    dx = (a["longitude"] - b["longitude"]) * 111_320 * math.cos(lat)
    dy = (a["latitude"] - b["latitude"]) * 110_540
    return math.hypot(dx, dy)


def richness(row: dict) -> tuple[int, int]:
    useful = sum(bool(row[key]) for key in ("city", "street", "website", "email", "phone"))
    return useful, row["osm_type"] == "way"


def point_in_ring(x: float, y: float, ring: list[list[float]]) -> bool:
    inside = False
    j = len(ring) - 1
    for i, (xi, yi) in enumerate(ring):
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def point_in_geometry(x: float, y: float, geometry: dict) -> bool:
    polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
    for rings in polygons:
        if point_in_ring(x, y, rings[0]) and not any(point_in_ring(x, y, hole) for hole in rings[1:]):
            return True
    return False


def find_municipality(lon: float, lat: float, municipalities: list[dict]) -> str:
    for feature in municipalities:
        if point_in_geometry(lon, lat, feature["geometry"]):
            return feature["properties"]["name"].removeprefix("Bashkia ")
    return ""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pbf", nargs="?", type=Path, default=Path("data/albania-latest.osm.pbf"))
    parser.add_argument("output", nargs="?", type=Path, default=Path("docs/assets/data/albania_education.csv"))
    parser.add_argument("--municipalities-output", type=Path, default=Path("docs/assets/data/education_municipality_boundaries.geojson"))
    args = parser.parse_args()

    rows: list[dict] = []
    for layer in ("points", "multipolygons"):
        for feature in read_layer(args.pbf, layer):
            props = feature["properties"]
            tags = parse_tags(props.get("other_tags"))
            amenity = props.get("amenity") or tags.get("amenity", "")
            building = props.get("building") or tags.get("building", "")
            name = props["name"].strip()
            is_gymnasium = "gjimnaz" in name.casefold()
            if amenity == "university":
                category = "University"
            elif is_gymnasium and (amenity == "school" or building == "school"):
                category = "Gymnasium"
            else:
                continue

            lon, lat = point(feature)
            osm_id = props.get("osm_way_id") or props.get("osm_id")
            osm_type = "node" if layer == "points" else ("way" if props.get("osm_way_id") else "relation")
            rows.append({
                "category": category,
                "name": name,
                "city": tags.get("addr:city", ""),
                "street": tags.get("addr:street", ""),
                "website": tags.get("website", tags.get("contact:website", "")),
                "email": tags.get("email", tags.get("contact:email", "")),
                "phone": tags.get("phone", tags.get("contact:phone", "")),
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "osm_type": osm_type,
                "osm_id": osm_id,
                "osm_url": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
            })

    # OSM sometimes maps both the school grounds and its building. Collapse only
    # same-name features within 150 m, retaining the record with richer metadata.
    deduped: list[dict] = []
    for row in sorted(rows, key=lambda item: richness(item), reverse=True):
        duplicate = next((existing for existing in deduped if
            existing["category"] == row["category"]
            and existing["name"].casefold() == row["name"].casefold()
            and distance_m(existing, row) < 150), None)
        if duplicate is None:
            deduped.append(row)

    municipalities_sql = (
        "SELECT osm_id,name,admin_level,geometry FROM multipolygons "
        "WHERE boundary='administrative' AND admin_level='7'"
    )
    args.municipalities_output.parent.mkdir(parents=True, exist_ok=True)
    municipalities_result = subprocess.run([
        "ogr2ogr", "-f", "GeoJSON", "/vsistdout/", str(args.pbf),
        "-dialect", "SQLITE", "-sql", municipalities_sql, "-simplify", "0.0005", "-lco", "RFC7946=YES",
    ], check=True, capture_output=True, text=True)
    args.municipalities_output.write_text(municipalities_result.stdout, encoding="utf-8")
    municipalities = json.loads(municipalities_result.stdout)["features"]
    print(f"Wrote {len(municipalities)} municipality boundaries to {args.municipalities_output}")

    # Many OSM features for schools/universities lack an addr:city tag. Backfill
    # those from the municipality polygon each point falls inside.
    backfilled = 0
    for row in deduped:
        if not row["city"]:
            municipality = find_municipality(row["longitude"], row["latitude"], municipalities)
            if municipality:
                row["city"] = municipality
                backfilled += 1

    deduped.sort(key=lambda row: (row["category"], row["city"].casefold(), row["name"].casefold()))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(deduped[0]))
        writer.writeheader()
        writer.writerows(deduped)
    counts = {category: sum(row["category"] == category for row in deduped) for category in ("University", "Gymnasium")}
    print(f"Wrote {len(deduped)} rows to {args.output} ({counts['University']} universities, {counts['Gymnasium']} gymnasiums, "
          f"{backfilled} cities backfilled from municipality boundaries)")


if __name__ == "__main__":
    main()
