(() => {
    const body = document.body;

    const showToast = (message) => {
        let toast = document.querySelector('.global-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'global-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('is-visible');
        window.clearTimeout(window.__toastTimer);
        window.__toastTimer = window.setTimeout(() => {
            toast.classList.remove('is-visible');
        }, 1800);
    };

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const toastMessage = target.closest('[data-toast]')?.getAttribute('data-toast');
        if (toastMessage) {
            showToast(toastMessage);
        }
    });

    document.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.matches('[data-upload-preview]') || !target.files?.[0]) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const preview = document.querySelector('[data-pixel-board]');
            if (preview instanceof HTMLElement) {
                preview.style.backgroundImage = `linear-gradient(180deg, rgba(15,23,42,.06), rgba(15,23,42,.02)), url('${String(reader.result)}')`;
                preview.style.backgroundSize = 'cover';
                preview.style.backgroundPosition = 'center';
            }
        };
        reader.readAsDataURL(target.files[0]);
        showToast('图片已读取，拼豆预览已刷新');
    });

    document.querySelectorAll('.nav-link, .terminal-tabs a, .h5-bottom a, .pc-front-nav nav a, .ops-sidebar a').forEach((link) => {
        link.addEventListener('click', () => {
            body.classList.add('is-navigating');
        });
    });
})();

(() => {
    // 预约订座：日期 / 时间段按钮切换选中态
    document.querySelectorAll('.booking-row').forEach((row) => {
        row.addEventListener('click', (event) => {
            const btn = event.target.closest('button');
            if (!btn) return;
            row.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === btn));
        });
    });
})();
