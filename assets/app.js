document.addEventListener('DOMContentLoaded', () => {
    // Menú móvil
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.getElementById('main-nav');
    
    menuToggle.addEventListener('click', () => {
        mainNav.classList.toggle('nav-open');
    });

    // Cerrar el menú móvil al hacer clic en un enlace
    mainNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav.classList.contains('nav-open')) {
                mainNav.classList.remove('nav-open');
            }
        });
    });

    // Traducción del sitio
    const langToggle = document.querySelector('.lang-toggle');
    const currentLang = document.documentElement.lang;
    
    const setLanguage = (lang) => {
        document.documentElement.lang = lang;
        
        // Traduce todos los elementos con data-es/data-en
        document.querySelectorAll('[data-es]').forEach(element => {
            if (lang === 'en') {
                element.textContent = element.dataset.en;
            } else {
                element.textContent = element.dataset.es;
            }
        });
        
        // Traduce todos los placeholders
        document.querySelectorAll('[data-es-placeholder]').forEach(input => {
            if (lang === 'en') {
                input.placeholder = input.dataset.enPlaceholder;
            } else {
                input.placeholder = input.dataset.esPlaceholder;
            }
        });
    };

    if (currentLang === 'en') {
        setLanguage('en');
        document.querySelector('[data-lang="en"]').classList.add('active');
        document.querySelector('[data-lang="es"]').classList.remove('active');
    } else {
        document.querySelector('[data-lang="es"]').classList.add('active');
        document.querySelector('[data-lang="en"]').classList.remove('active');
    }

    langToggle.addEventListener('click', (e) => {
        if (e.target.dataset.lang) {
            setLanguage(e.target.dataset.lang);
            document.querySelectorAll('.lang-toggle span').forEach(span => span.classList.remove('active'));
            e.target.classList.add('active');
        }
    });

    // Modo oscuro
    const themeToggle = document.querySelector('.theme-toggle');
    const html = document.documentElement;

    themeToggle.addEventListener('click', () => {
        html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    });

    // Acordeón
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const currentItem = header.parentElement;
            const currentContent = header.nextElementSibling;
            
            if (header.classList.contains('active')) {
                header.classList.remove('active');
                currentContent.classList.remove('active');
            } else {
                accordionHeaders.forEach(h => {
                    h.classList.remove('active');
                    h.nextElementSibling.classList.remove('active');
                });
                header.classList.add('active');
                currentContent.classList.add('active');
            }
        });
    });

    // Resaltar el menú al hacer scroll
    const sections = document.querySelectorAll('section[id]');
    const mainNavLinks = mainNav.querySelectorAll('a');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });

        mainNavLinks.forEach(link => {
            link.classList.remove('active');
            if (link.href.includes(current)) {
                link.classList.add('active');
            }
        });
    });

    // Lightbox de Galería
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const closeLightboxBtn = document.getElementById('close-lightbox');

    document.querySelectorAll('.gallery-item img').forEach(item => {
        item.addEventListener('click', () => {
            lightbox.classList.add('active');
            lightboxImage.src = item.dataset.fullImg || item.src;
        });
    });

    closeLightboxBtn.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') {
            lightbox.classList.remove('active');
        }
    });

    // Manejo del formulario de contacto
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const data = new FormData(form);
        const url = form.action;

        // Muestra un mensaje de "Enviando..."
        formStatus.textContent = "Enviando mensaje...";
        formStatus.style.color = '#ffc107';

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: data,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                // Éxito: Muestra mensaje y limpia el formulario
                formStatus.textContent = "¡Mensaje enviado exitosamente! Pronto nos contactaremos contigo.";
                formStatus.style.color = '#2e7d32'; // Verde
                form.reset();
            } else {
                // Error en el envío
                formStatus.textContent = "Hubo un problema. Por favor, inténtalo de nuevo más tarde.";
                formStatus.style.color = '#ff0000'; // Rojo
            }
        } catch (error) {
            // Error de red
            formStatus.textContent = "Error de conexión. Revisa tu internet y vuelve a intentarlo.";
            formStatus.style.color = '#ff0000'; // Rojo
        } finally {
            // Limpia el mensaje de estado después de 5 segundos
            setTimeout(() => {
                formStatus.textContent = '';
            }, 5000);
        }
    });

});