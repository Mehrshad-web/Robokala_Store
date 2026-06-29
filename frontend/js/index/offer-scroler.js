       const scroll = document.getElementById("psScroll");

        document.querySelector(".next-offer").onclick = () => {
            scroll.scrollBy({ left: 220, behavior: "smooth" });
        };

        document.querySelector(".prev-offer").onclick = () => {
            scroll.scrollBy({ left: -220, behavior: "smooth" });
        };