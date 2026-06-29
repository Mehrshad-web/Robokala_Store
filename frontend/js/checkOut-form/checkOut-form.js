       // ================= ADDRESS SELECT =================
        function selectAddress(card) {
            document.querySelectorAll('.address-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        }
        // ================= ADD ADDRESS TOGGLE =================
        const addAddressBtn = document.getElementById('addAddressBtn');
        const newAddressForm = document.getElementById('newAddressForm');
        let addressFormOpen = false;
        addAddressBtn.addEventListener('click', () => {
            addressFormOpen = !addressFormOpen;
            newAddressForm.classList.toggle(
                'open',
                addressFormOpen
            );
            addAddressBtn.classList.toggle(
                'open',
                addressFormOpen
            );
            addAddressBtn.innerHTML = addressFormOpen
                ? '<i class="ti ti-x"></i> بستن'
                : '<i class="ti ti-plus"></i> افزودن آدرس جدید';
        });
        // ================= PAYMENT SELECT =================
        function selectPayment(method) {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
            method.classList.add('selected');
        }
        // ================= DISCOUNT CODE =================
        document.getElementById('discountBtn').addEventListener('click', () => {
            const input = document.querySelector('.discount-wrap .checkout-input');
            if (!input.value.trim()) return;
            // fetch('/api/discount/apply', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ code: input.value })
            // })
            // .then(res => res.json())
            // .then(data => {
            //     // آپدیت قیمت نهایی با تخفیف
            // });
        });
        // ================= SUBMIT =================
        document.getElementById('checkoutSubmit').addEventListener('click', () => {
            const selectedPayment = document.querySelector('.payment-method.selected .payment-method-name')?.textContent;
            const selectedAddress = document.querySelector('.address-card.selected');
            if (!selectedAddress) {
                alert('لطفاً آدرس تحویل را انتخاب کنید');
                return;
            }
            // fetch('/api/orders/create', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         addressId: selectedAddress.dataset.id,
            //         paymentMethod: selectedPayment,
            //     })
            // })
            // .then(res => res.json())
            // .then(data => {
            //     if (data.paymentUrl) window.location.href = data.paymentUrl; // درگاه آنلاین
            // });
            console.log('پرداخت:', selectedPayment);
        });
        // ================= REMOVE ORDER ITEM =================
        function removeOrderItem(btn) {
            const item = btn.closest('.order-item');
            item.style.transition =
                'opacity .35s ease, transform .35s ease';
            item.style.opacity = '0';
            item.style.transform =
                'translateX(30px) scale(.96)';
            setTimeout(() => {
                item.remove();
                rebuildOrderShowMore();
                // API
                // DELETE /api/cart/remove
                // body: {
                //   productId: item.dataset.id
                // }
            }, 350);
        }
        // ================= REBUILD SHOW MORE =================
        function rebuildOrderShowMore() {
            const list =
                document.getElementById('orderItemsList');
            const oldBtn =
                list.parentElement.querySelector('.show-more-btn');
            oldBtn?.remove();
            const wrapper =
                list.querySelector('.show-more-content');
            if (wrapper) {
                [...wrapper.children].forEach(item => {
                    list.appendChild(item);
                });
                wrapper.remove();
            }
            initShowMore(
                list,
                3,
                'show-more-orders'
            );
        }
        // ================= SHOW MORE =================
        function initShowMore(container, limit, className) {
            if (!container) return;
            const items = Array.from(container.children);
            if (items.length <= limit) return;
            const wrapper = document.createElement('div');
            wrapper.className =
                `show-more-content ${className}`;
            items.forEach((item, index) => {
                if (index >= limit) {
                    item.style.transitionDelay =
                        `${Math.min((index - limit) * 35, 180)}ms`
                    wrapper.appendChild(item);
                }
            });
            container.appendChild(wrapper);
            const btn = document.createElement('button');
            btn.className = 'show-more-btn';
            const count = items.length - limit;
            let isOpen = false;
            btn.innerHTML = `
        <i class="ti ti-chevron-down"></i>
        <span>${count} مورد بیشتر</span>
    `;
            btn.addEventListener('click', () => {
                isOpen = !isOpen;
                wrapper.classList.toggle(
                    'open',
                    isOpen
                );
                btn.classList.toggle(
                    'open',
                    isOpen
                );
                const icon = btn.querySelector('i');
                const text = btn.querySelector('span');
                icon.className =
                    isOpen
                        ? 'ti ti-chevron-up'
                        : 'ti ti-chevron-down';
                text.textContent =
                    isOpen
                        ? 'بستن'
                        : `${count} مورد بیشتر`;
            });
            container.parentElement.insertBefore(
                btn,
                container.nextSibling
            );
        }
        initShowMore(document.getElementById('addressList'), 2, 'show-more-address');
        initShowMore(document.getElementById('paymentMethods'), 3, 'show-more-payment');
        initShowMore(document.getElementById('orderItemsList'), 3, 'show-more-orders');