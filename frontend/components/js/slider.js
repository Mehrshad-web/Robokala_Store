       const bsScroll = document.getElementById('bestSellerScroll');

        document.querySelector('.bs-next').onclick = () => {
            bsScroll.scrollBy({
                left: -500,
                behavior: 'smooth'
            });
        };

        document.querySelector('.bs-prev').onclick = () => {
            bsScroll.scrollBy({
                left: 500,
                behavior: 'smooth'
            });
        };