const form = document.getElementById('form');
const btn = document.getElementById('submit');

function showErrors(errors) {
  form.querySelectorAll('small.msg').forEach(n => n.remove());
  form.querySelectorAll('.invalid').forEach(n => n.classList.remove('invalid'));
  document.getElementById('consent-error').textContent = errors.consent || '';
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const el = form.elements[name];
    if (!el || name === 'consent') continue;
    el.classList.add('invalid');
    const s = document.createElement('small');
    s.className = 'msg';
    s.textContent = msg;
    el.parentElement.appendChild(s);
    first = first || el;
  }
  if (first) first.focus();
}

function clientCheck(data) {
  const e = {};
  form.querySelectorAll('[required]').forEach(el => {
    if (!el.value.trim()) e[el.name] = 'This field is required';
  });
  if (!e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'Enter a valid email address';
  ['phone', 'emergency_phone'].forEach(k => {
    if (!e[k] && !/^\+?[0-9 ]{10,15}$/.test(data[k])) e[k] = 'Enter 10–15 digits';
  });
  if (!data.consent) e.consent = 'Please confirm the declaration';
  return e;
}

form.addEventListener('submit', async ev => {
  ev.preventDefault();
  document.getElementById('form-error').textContent = '';
  const data = Object.fromEntries(new FormData(form));
  data.consent = form.elements.consent.checked;

  const errors = clientCheck(data);
  showErrors(errors);
  if (Object.keys(errors).length) return;

  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const out = await res.json();
    if (!res.ok) {
      if (out.errors) showErrors(out.errors);
      else document.getElementById('form-error').textContent = out.error || 'Something went wrong.';
      return;
    }
    form.hidden = true;
    document.getElementById('regno').textContent = out.reg_no;
    document.getElementById('pdf').href = `/api/registration/${out.reg_no}/pdf`;
    document.getElementById('success').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    document.getElementById('form-error').textContent = 'Cannot reach the server. Check your connection and try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit registration';
  }
});
