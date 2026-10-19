document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tabbed-block').forEach((email) => {
    const subject = email.querySelector(':scope > p:first-of-type');
    if (!subject?.querySelector('strong')) return;

    subject.classList.add('email-subject');

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'email-subject__copy';
    copy.textContent = 'Copy subject';
    copy.setAttribute('aria-label', 'Copy email subject');

    copy.addEventListener('click', async () => {
      const subjectCopy = subject.cloneNode(true);
      subjectCopy.querySelectorAll('strong, button').forEach((node) => node.remove());
      const text = subjectCopy.textContent.trim();

      try {
        await navigator.clipboard.writeText(text);
        copy.textContent = 'Copied';
        window.setTimeout(() => { copy.textContent = 'Copy subject'; }, 1600);
      } catch {
        copy.textContent = 'Copy failed';
        window.setTimeout(() => { copy.textContent = 'Copy subject'; }, 1600);
      }
    });

    subject.append(copy);
  });
});
