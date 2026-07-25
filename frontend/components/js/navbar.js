// ===================== SCROLL EFFECT =====================

const island = document.getElementById('island');
const byLogo = document.getElementById('byLogo');
const bybtn = document.getElementById('bybtn');

let peeked = false;

window.addEventListener('scroll', () => {

    const scrolled = window.scrollY > 80;

    // جلوگیری از toggle اضافی
    if (scrolled !== peeked) {

        peeked = scrolled;

        island?.classList.toggle('peeked', scrolled);
        byLogo?.classList.toggle('Bypeeked', scrolled);
        bybtn?.classList.toggle('Bypeeked', scrolled);
    }

}, { passive: true });


// ===================== NAVBAR LINKS =====================

const navLinks = document.querySelectorAll('.links .lnk');
const currentPage = window.location.pathname;

navLinks.forEach(btn => {

    const text = btn.textContent.trim();

    btn.style.cursor = 'pointer';

    // ================= CLICK EVENTS =================

    if (text === 'خانه') {

        btn.onclick = () => {
            window.location.href = '/';
        };

    } else if (text === 'محصولات') {

        btn.onclick = () => {
            window.location.href = '/products-explore.html';
        };

    } else if (text === 'پکیج ها') {

        btn.onclick = () => {
            window.location.href =
                '/products-explore.html?category=آموزشی';
        };

    } else if (btn.querySelector('.ti-shopping-cart')) {

        btn.onclick = () => {
            window.location.href = '/shopping-cart.html';
        };
    }

    // ================= ACTIVE LINK =================

    btn.classList.remove('active');

    if (currentPage === '/' && text === 'خانه') {

        btn.classList.add('active');

    } else if (
        currentPage.includes('products-explore') &&
        text === 'محصولات'
    ) {

        btn.classList.add('active');

    } else if (
        currentPage.includes('shopping-cart') &&
        btn.querySelector('.ti-shopping-cart')
    ) {

        btn.classList.add('active');
    }
});


// ===================== PROFILE ICON =====================

const accountIcon = document.getElementById('bybtn');

if (accountIcon) {

    accountIcon.style.cursor = 'pointer';

    accountIcon.addEventListener('click', async () => {

        // کاربر لاگین نیست
        if (!isLoggedIn()) {

            window.location.href = '/authentication.html';
            return;
        }

        // بررسی اعتبار توکن
        const res = await authFetch('/auth/me');

        // توکن معتبر
        if (res && res.ok) {

            window.location.href = '/user-panel.html';
        }
    });
}


// ===================== SEARCH =====================

const searchBtn = document.getElementById('searchBtn');
const searchWrapper = document.getElementById('searchWrapper');
const searchInput = document.getElementById('searchInput');

function doHeaderSearch() {

    const q = searchInput?.value?.trim();

    if (!q) return;

    window.location.href =
        `/products-explore.html?search=${encodeURIComponent(q)}`;
}

if (searchBtn && searchWrapper && searchInput) {

    searchBtn.addEventListener('click', (e) => {

        e.stopPropagation();

        // باز کردن سرچ
        if (!searchWrapper.classList.contains('active')) {

            searchWrapper.classList.add('active');

            setTimeout(() => {
                searchInput.focus();
            }, 300);

            return;
        }

        // اجرای سرچ
        doHeaderSearch();
    });

    // Enter Search
    searchInput.addEventListener('keydown', (e) => {

        if (e.key === 'Enter') {

            e.preventDefault();

            doHeaderSearch();
        }
    });

    // بستن سرچ
    document.addEventListener('click', (e) => {

        if (!searchWrapper.contains(e.target)) {

            searchWrapper.classList.remove('active');
        }
    });
}
