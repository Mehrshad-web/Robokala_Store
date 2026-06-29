// ================= TABS =================
const tabsWrap = document.querySelector('.academy-tabs');
const tabs = document.querySelectorAll('.academy-tab');
const sections = document.querySelectorAll('.academy-section');

tabs.forEach(tab => {

    tab.addEventListener('click', () => {

        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));

        tab.classList.add('active');

        if (tab.dataset.tab === 'videos') {
            tabsWrap.classList.add('show-videos');
        } else {
            tabsWrap.classList.remove('show-videos');
        }

        document
            .getElementById('section-' + tab.dataset.tab)
            .classList.add('active');

        // ================= API =================
        // fetch(`/api/academy/${tab.dataset.tab}`)
        //     .then(res => res.json())
        //     .then(data => {
        //         // render data
        //     });

    });

});

// ================= CATEGORY FILTER =================
document.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const activeTab = document.querySelector('.academy-tab.active').dataset.tab;
        // fetch('/api/academy/' + activeTab + '?category=' + pill.textContent)
    });
});