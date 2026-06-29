// ================= TOC SCROLL SPY =================
const tocItems = document.querySelectorAll('.toc-item');
const sections = document.querySelectorAll('.article-body-text h2');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= 150) current = sec.id;
    });
    tocItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('href') === '#' + current);
    });
});

// ================= LIKE =================
const likeBtn = document.getElementById('likeBtn');
const likeCount = document.getElementById('likeCount');
let liked = false;

likeBtn.addEventListener('click', () => {
    liked = !liked;
    likeBtn.classList.toggle('liked', liked);
    let count = parseInt(likeCount.textContent.replace(/[^\d]/g, ''));
    count = liked ? count + 1 : count - 1;
    likeCount.textContent = count.toLocaleString('fa');
    // fetch('/api/articles/like', { method: 'POST', ... })
}); 