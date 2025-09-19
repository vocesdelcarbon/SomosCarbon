document.addEventListener('DOMContentLoaded', () => {

  // --- Funcionalidad del Modo Oscuro/Claro ---
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-sun', newTheme === 'dark');
    icon.classList.toggle('fa-moon', newTheme === 'light');
    localStorage.setItem('theme', newTheme);
  });

  const savedTheme = localStorage.getItem('theme') || 'light';
  body.setAttribute('data-theme', savedTheme);
  const icon = themeToggle.querySelector('i');
  if (savedTheme === 'dark') {
      icon.classList.add('fa-sun');
      icon.classList.remove('fa-moon');
  } else {
      icon.classList.add('fa-moon');
      icon.classList.remove('fa-sun');
  }

  // --- Funcionalidad del Traductor ---
  const translations = {
    es: {
      nav: {
        home: 'Inicio',
        socials: 'Redes Sociales',
        statement: 'Comunicado',
        about: 'Nuestra Causa',
        decrees: 'Decretos',
        gallery: 'Galería',
        contact: 'Contacto'
      },
      planton: {
        title: 'Voces del Carbón',
        subtitle: 'Minería legal, trabajo estable - El carbón es vida.',
        date: '19 de septiembre de 2025',
        location: 'Plaza de la Casa de la Juventud, detrás del Colegio José Guillermo Castro.',
        directions: 'Cómo llegar'
      },
      socials: {
        title: 'Nuestras Redes Sociales',
        subtitle: 'Síguenos en nuestras redes sociales oficiales para mantenerte informado:',
        whatsapp: 'WhatsApp',
        facebook: 'Facebook',
        telegram: 'Telegram',
        instagram: 'Instagram',
        twitter: 'X (Twitter)'
      },
      statement: {
        title: 'Comunicado Oficial a la Opinión Pública',
        text: 'Compartimos nuestro comunicado oficial sobre el panorama regulatorio y tributario que afecta al sector minero del carbón en Colombia, y su impacto en el empleo y las regiones del Cesar y La Guajira. Lee el documento completo a continuación o descárgalo.',
        download: 'Descargar PDF',
        open: 'Abrir en pestaña nueva'
      },
      about: {
        title: 'Nuestra Causa',
        description: 'Voces del Carbón es un colectivo ciudadano comprometido con el futuro de la región del Cesar y La Guajira, promoviendo la minería legal como pilar del desarrollo y el empleo digno.'
      },
      decrees: {
        title: 'Nuestra Posición sobre los Decretos',
        decree0949Title: 'Decreto 0949',
        decree0949Text: 'En un acto de protesta pacífica, trabajadores, familias y la comunidad del corredor minero marchamos juntos en contra del Decreto 0949. Tu voz cuenta, tu presencia importa. Por un desarrollo regional sostenible y por el futuro del carbón, ¡marcha con nosotros!',
        decree572Title: 'Decreto 572 de 2025',
        decree572Text: 'El Decreto 572 de 2025 introduce ajustes tributarios en retención y autorretención. Esto se traduce en más cargas fiscales para las empresas mineras, lo que podría debilitar el sector y poner en riesgo el empleo y la competitividad a nivel mundial. Si la empresa se debilita, todos perdemos.'
      },
      gallery: {
        title: 'Galería',
        subtitle: 'Mira algunas fotos de nuestros eventos y lucha.',
        more: 'Ver más fotos y videos en Google Drive'
      },
      contact: {
        title: 'Contáctanos',
        subtitle: 'Envíanos un mensaje. Solo te pedimos lo básico para responderte.',
        nameLabel: 'Nombre completo',
        namePlaceholder: 'Juan Pérez 👋',
        emailLabel: 'Correo electrónico',
        emailPlaceholder: 'ejemplo@gmail.com',
        subjectLabel: 'Asunto',
        subjectPlaceholder: 'Consulta sobre minería legal',
        messageLabel: 'Mensaje',
        messagePlaceholder: 'Escribe tu mensaje aquí...',
        sendMessage: 'Enviar Mensaje'
      },
      footer: {
        description: 'Movimiento comunitario por la minería legal y el trabajo estable.',
        rights: 'Todos los derechos reservados.',
        quickLinks: 'Enlaces Rápidos',
        missionVision: 'Misión y Visión',
        principles: 'Principios',
        actions: 'Acciones',
        participate: 'Participa',
        faq: 'FAQ',
        press: 'Prensa',
        followUs: 'Síguenos'
      }
    },
    en: {
      nav: {
        home: 'Home',
        socials: 'Social Media',
        statement: 'Statement',
        about: 'Our Cause',
        decrees: 'Decrees',
        gallery: 'Gallery',
        contact: 'Contact'
      },
      planton: {
        title: 'Voces del Carbón',
        subtitle: 'Legal mining, stable work - Coal is life.',
        date: 'September 19th, 2025',
        location: 'Plaza de la Casa de la Juventud, behind Colegio José Guillermo Castro.',
        directions: 'How to get there'
      },
      socials: {
        title: 'Our Social Media',
        subtitle: 'Follow us on our official social media channels to stay informed:',
        whatsapp: 'WhatsApp',
        facebook: 'Facebook',
        telegram: 'Telegram',
        instagram: 'Instagram',
        twitter: 'X (Twitter)'
      },
      statement: {
        title: 'Official Statement to the Public',
        text: 'We share our official statement on the regulatory and tax landscape affecting the coal mining sector in Colombia, and its impact on employment and the regions of Cesar and La Guajira. Read the full document below or download it.',
        download: 'Download PDF',
        open: 'Open in new tab'
      },
      about: {
        title: 'Our Cause',
        description: 'Voces del Carbón is a citizen collective committed to the future of the Cesar and La Guajira region, promoting legal mining as a pillar of development and dignified employment.'
      },
      decrees: {
        title: 'Our Position on the Decrees',
        decree0949Title: 'Decree 0949',
        decree0949Text: 'Decree 0949 imposes new burdens on the coal industry, jeopardizing job stability and the economic development of the region. With measures that restrict competitiveness and reduce employment opportunities, this decree directly threatens the livelihood of thousands of families in the mining corridor. We raise our voice in defense of decent work, legal mining, and the future of coal as a driving force for progress in our communities.',
        decree572Title: 'Decree 572 of 2025',
        decree572Text: 'Decree 572 of 2025 introduces tax adjustments in withholding and self-withholding. This leads to more tax burdens for mining companies, which could weaken the sector and jeopardize employment and global competitiveness. If the company weakens, we all lose.'
      },
      gallery: {
        title: 'Gallery',
        subtitle: 'See some photos of our events and struggle.',
        more: 'View more photos and videos on Google Drive'
      },
      contact: {
        title: 'Contact Us',
        subtitle: 'Send us a message. We only ask for the basics to respond to you.',
        nameLabel: 'Full Name',
        namePlaceholder: 'John Doe 👋',
        emailLabel: 'Email Address',
        emailPlaceholder: 'example@gmail.com',
        subjectLabel: 'Subject',
        subjectPlaceholder: 'Inquiry about legal mining',
        messageLabel: 'Message',
        messagePlaceholder: 'Write your message here...',
        sendMessage: 'Send Message'
      },
      footer: {
        description: 'Community movement for legal mining and stable employment.',
        rights: 'All rights reserved.',
        quickLinks: 'Quick Links',
        missionVision: 'Mission and Vision',
        principles: 'Principles',
        actions: 'Actions',
        participate: 'Participate',
        faq: 'FAQ',
        press: 'Press',
        followUs: 'Follow Us'
      }
    }
  };

  const languageSwitcher = document.getElementById('language-switcher');
  const elementsToTranslate = document.querySelectorAll('[data-i18n]');
  const contactFormInputs = document.querySelectorAll('#contact-form input[type="text"], #contact-form input[type="email"], #contact-form textarea');
  const contactFormButton = document.querySelector('#contact-form button[type="submit"]');

  const setLanguage = (lang) => {
    localStorage.setItem('lang', lang);
    elementsToTranslate.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const keys = key.split('.');
      let text = translations[lang];
      keys.forEach(k => {
        if (text && typeof text === 'object' && text.hasOwnProperty(k)) {
          text = text[k];
        } else {
          text = '';
        }
      });
      if (text) {
        el.textContent = text;
      }
    });

    contactFormInputs.forEach(input => {
      const placeholderKey = input.id + 'Placeholder';
      if (translations[lang].contact[placeholderKey]) {
        input.placeholder = translations[lang].contact[placeholderKey];
      }
    });

    if (contactFormButton && translations[lang].contact.sendMessage) {
      contactFormButton.innerHTML = `<i class="fas fa-paper-plane"></i> ${translations[lang].contact.sendMessage}`;
    }

    languageSwitcher.querySelectorAll('span').forEach(span => {
      span.classList.toggle('active', span.getAttribute('data-lang') === lang);
    });
  };

  languageSwitcher.addEventListener('click', (event) => {
    if (event.target.tagName === 'SPAN') {
      const lang = event.target.getAttribute('data-lang');
      setLanguage(lang);
    }
  });

  const savedLang = localStorage.getItem('lang') || 'es';
  setLanguage(savedLang);

});