      const items = [
            { icon: "ti-truck-delivery", title: "ارسال رایگان", sub: "برای سفارش‌های بالای 1 میلیون تومان" },
            { icon: "ti-shield-check", title: "ضمانت کیفیت", sub: "گارانتی بهترین کیفیت بازار" },
            { icon: "ti-headset", title: "پشتیبانی ۲۴/۷", sub: "همیشه در کنار شما هستیم" },
            // { icon: "ti-clock", title: "تحویل سریع", sub: "ارسال در کمتر از ۴۸ ساعت" },
            { icon: "ti-lock", title: "پرداخت امن", sub: "درگاه معتبر و رمزنگاری‌شده" },
            // { icon: "ti-refresh", title: "مرجوعی آسان", sub: "بدون سوال، تا 7 روز بعد از خرید" },
        ];

        const html = items.map(d => `
      <div class="feat">
        <i class="ti ${d.icon}"></i>
        <div class="feat-inner">
          <div class="feat-title">${d.title}</div>
          <div class="feat-sub">${d.sub}</div>
        </div>
      </div>
    `).join('');

        document.getElementById('track').innerHTML = html;