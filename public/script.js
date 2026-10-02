const form = document.getElementById('regForm');
const msg = document.getElementById('msg');
const btn = document.getElementById('submitBtn');
const successBox = document.getElementById('success');
const regnoEl = document.getElementById('regno');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  msg.textContent = '';
  msg.style.color = '#667085';

  const fd = new FormData(form);
  
  // Backend jo naam expect karta hai wahi bhej rahe hain
  const payload = {
    fullName: fd.get('fullName')?.trim(),
    email: fd.get('email')?.trim(),
    phone: fd.get('phone')?.trim(),
    dob: fd.get('dob'),
    gender: fd.get('gender'),
    city: fd.get('city')?.trim(),
    state: fd.get('state')?.trim(),
    course: fd.get('course'),
    qualification: fd.get('qualification')
  };

  // Basic validation
  if(!payload.fullName || payload.fullName.length < 3){
    msg.textContent = 'Full name me kam se kam 3 letters likho';
    msg.style.color = 'red';
    btn.disabled = false;
    btn.textContent = 'Submit Registration →';
    return;
  }
  if(!/^[0-9]{10}$/.test(payload.phone)){
    msg.textContent = 'Phone 10 digits ka hona chahiye';
    msg.style.color = 'red';
    btn.disabled = false;
    btn.textContent = 'Submit Registration →';
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Server response:', data);

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Failed to register');
    }

    // Success
    form.style.display = 'none';
    document.querySelector('.hint').style.display = 'none';
    successBox.hidden = false;
    if(regnoEl && data.reg_no){
      regnoEl.textContent = data.reg_no;
    } else if(regnoEl && data.regNo){
      regnoEl.textContent = data.regNo;
    } else if(regnoEl){
      regnoEl.textContent = data.reg_no || 'REG-SAVED';
    }

  } catch (err) {
    console.error(err);
    msg.textContent = err.message;
    if(err.message.includes('already') || err.message.includes('duplicate')){
      msg.textContent = 'Is email se pehle se registration ho chuka hai!';
    }
    msg.style.color = 'red';
    btn.disabled = false;
    btn.textContent = 'Submit Registration →';
  }
});