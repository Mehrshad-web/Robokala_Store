// ==================== comment ==================== 
function toggleReply(btn) {
    const card = btn.closest('.comment-card');
    document.querySelectorAll('.reply-form.open').forEach(form => {
        if (form.closest('.comment-card') !== card) {
            form.classList.remove('open');
        }
    });
    let form = card.querySelector('.reply-form');
    if (!form) {
        form = document.createElement('div');
        form.className = 'reply-form';
        form.innerHTML = `
            <textarea rows="3" placeholder="پاسخ شما..."></textarea>
            <button class="send-reply-btn">ارسال پاسخ</button>
        `;
        form.querySelector('.send-reply-btn').addEventListener('click', () => {
            const text = form.querySelector('textarea').value;
            if (!text.trim()) return;
            // fetch('/api/comments/reply', { method: 'POST', ... })
            console.log('ارسال پاسخ:', text);
        });
        card.appendChild(form);
    }
    form.classList.toggle('open');
}