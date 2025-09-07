// Datos de los enlaces
const linksData = [
    {
        id: 'whatsapp',
        title: 'WhatsApp',
        subtitle: 'Grupo oficial',
        url: 'https://chat.whatsapp.com/B787KN9D9sd4m16CuU8HRu?mode=ems_copy_c',
        icon: 'fab fa-whatsapp'
    },
    {
        id: 'telegram',
        title: 'Telegram',
        subtitle: 'Canal público',
        url: 'https://t.me/VocesDelCarbon',
        icon: 'fab fa-telegram'
    },
    {
        id: 'facebook',
        title: 'Facebook',
        subtitle: 'Página oficial',
        url: 'https://www.facebook.com/share/1C2miTFDoC/',
        icon: 'fab fa-facebook'
    },
    {
        id: 'instagram',
        title: 'Instagram',
        subtitle: '@vocesdelcarbon',
        url: 'https://www.instagram.com/vocesdelcarbon',
        icon: 'fab fa-instagram'
    },
    {
        id: 'twitter',
        title: 'X / Twitter',
        subtitle: '@VocesdelCarbon',
        url: 'https://x.com/Vocesdelcarbon',
        icon: 'fab fa-x-twitter'
    },
    {
        id: 'tiktok',
        title: 'TikTok',
        subtitle: '@voces.del.carbon',
        url: 'https://www.tiktok.com/@voces.del.carbon',
        icon: 'fab fa-tiktok'
    },
    {
        id: 'youtube',
        title: 'YouTube',
        subtitle: 'Canal oficial',
        url: 'https://youtube.com/@vocesdelcarbon',
        icon: 'fab fa-youtube'
    }
];

// URL base para compartir y QR
const SITE_URL = 'https://vocesdelcarbon.github.io/SomosCarbon/';

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initLinkCards();
    initShare();
    initQR();
    initTooltips();
    initKeyboardShortcuts();
});

// Función para inicializar el toggle de tema
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Establecer tema inicial
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-sun';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeIcon.className = 'fas fa-moon';
    }
    
    // Alternar tema al hacer clic
    themeToggle.addEventListener('click', () => {
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeIcon.className = 'fas fa-moon';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeIcon.className = 'fas fa-sun';
        }
    });
}

// Función para inicializar las tarjetas de enlaces
function initLinkCards() {
    const linksContainer = document.getElementById('links-container');
    
    linksData.forEach(link => {
        // Obtener contador de clics desde localStorage
        const clickCount = localStorage.getItem(`clicks_${link.id}`) || 0;
        
        // Crear elemento de tarjeta
        const card = document.createElement('a');
        card.href = link.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.className = 'link-card';
        card.setAttribute('data-id', link.id);
        
        card.innerHTML = `
            <div class="link-icon">
                <i class="${link.icon}"></i>
            </div>
            <div class="link-content">
                <div class="link-title">${link.title}</div>
                <div class="link-subtitle">${link.subtitle}</div>
            </div>
            <div class="link-arrow">
                <i class="fas fa-chevron-right"></i>
            </div>
            ${clickCount > 0 ? `<div class="click-badge">${clickCount}</div>` : ''}
        `;
        
        // Añadir efecto RGB al presionar
        card.addEventListener('mousedown', (e) => {
            createRipple(e, card);
            rgbEffect(card);
            
            // Contar clic
            const id = card.getAttribute('data-id');
            let clicks = parseInt(localStorage.getItem(`clicks_${id}`) || 0);
            clicks++;
            localStorage.setItem(`clicks_${id}`, clicks);
            
            // Actualizar badge
            const existingBadge = card.querySelector('.click-badge');
            if (existingBadge) {
                existingBadge.textContent = clicks;
            } else {
                const badge = document.createElement('div');
                badge.className = 'click-badge';
                badge.textContent = clicks;
                card.appendChild(badge);
            }
        });
        
        linksContainer.appendChild(card);
    });
}

// Función para crear efecto ripple
function createRipple(event, element) {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Función para efecto RGB mejorado
function rgbEffect(element) {
    // Solo aplicar a la tarjeta específica, no a todo
    anime({
        targets: element,
        background: [
            'rgba(43, 168, 74, 0.3)',
            'rgba(242, 194, 0, 0.3)',
            'rgba(217, 83, 79, 0.3)',
            'rgba(46, 134, 171, 0.3)',
            element.style.background
        ],
        duration: 600,
        easing: 'easeOutQuad'
    });
}

// Función para inicializar tooltips
function initTooltips() {
    if (typeof tippy !== 'undefined') {
        tippy('.link-card', {
            content: 'Toca para abrir • Mantén para previsualizar',
            placement: 'top',
            theme: 'custom',
            delay: [100, 0],
            touch: ['hold', 500]
        });
    }
}

// Función para inicializar compartir
function initShare() {
    const shareBtn = document.getElementById('share-btn');
    
    shareBtn.addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({
                title: 'Voces del Carbón',
                text: 'Minería legal, trabajo estable – El carbón es vida.',
                url: SITE_URL
            })
            .then(() => console.log('Contenido compartido exitosamente'))
            .catch((error) => console.log('Error al compartir:', error));
        } else {
            // Fallback: copiar al portapapeles
            navigator.clipboard.writeText(SITE_URL)
                .then(() => {
                    showConfetti();
                    alert('¡Enlace copiado al portapapeles!');
                })
                .catch(err => {
                    console.error('Error al copiar: ', err);
                });
        }
    });
}

// Función para inicializar QR
function initQR() {
    const qrBtn = document.getElementById('qr-btn');
    const modal = document.getElementById('qr-modal');
    const modalClose = document.getElementById('modal-close');
    
    // Generar QR
    if (typeof QRCode !== 'undefined') {
        new QRCode(document.getElementById('qrcode'), {
            text: SITE_URL,
            width: 200,
            height: 200,
            colorDark : '#0B0F10',
            colorLight : '#ffffff',
            correctLevel : QRCode.CorrectLevel.H
        });
    }
    
    // Abrir modal
    qrBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });
    
    // Cerrar modal
    modalClose.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// Función para inicializar atajos de teclado
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Atajo 'D' para alternar tema
        if (e.key === 'd' || e.key === 'D') {
            document.getElementById('theme-toggle').click();
        }
    });
}

// Función para mostrar confeti
function showConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    
    for (let i = 0; i < 12; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Alternar colores
        if (i % 4 === 0) confetti.classList.add('yellow');
        if (i % 4 === 1) confetti.classList.add('red');
        if (i % 4 === 2) confetti.classList.add('blue');
        if (i % 4 === 3) confetti.classList.add('white');
        
        // Posición inicial aleatoria
        const startX = Math.random() * window.innerWidth;
        const startY = -20;
        
        // Establecer posición inicial
        confetti.style.left = `${startX}px`;
        confetti.style.top = `${startY}px`;
        
        // Añadir al contenedor
        container.appendChild(confetti);
        
        // Animación con anime.js
        if (typeof anime !== 'undefined') {
            anime({
                targets: confetti,
                translateY: window.innerHeight + 50,
                translateX: (Math.random() - 0.5) * 200,
                rotate: Math.random() * 360,
                opacity: [0, 1, 0],
                duration: 1500 + Math.random() * 1000,
                easing: 'easeOutQuad',
                complete: function() {
                    confetti.remove();
                }
            });
        }
    }
}