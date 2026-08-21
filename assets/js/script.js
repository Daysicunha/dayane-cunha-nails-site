/* =========================================
   INIT GSAP & ESTADOS INICIAIS
========================================= */
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Remove o travamento da página após o carregamento
window.addEventListener("load", () => {
    document.body.classList.add("loaded");
});

/* =========================================
   MENU MOBILE
========================================= */
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.getElementById('mobile-menu');

if (hamburger && mobileMenu) {
    // Abre/fecha o menu ao clicar no botão
    hamburger.addEventListener('click', () => {
        const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', !isExpanded);
        
        // Alterna uma classe ativa que você pode estilizar no CSS (ex: display: flex)
        mobileMenu.classList.toggle('active'); 
        hamburger.classList.toggle('active');
    });

    // Fecha o menu ao clicar em qualquer link interno
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.setAttribute('aria-expanded', 'false');
            mobileMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
}

/* =========================================
   HEADER DINÂMICO (LUXO)
========================================= */
const header = document.querySelector(".header");

ScrollTrigger.create({
    start: "top -80",
    onUpdate: self => {
        // Se rolou para baixo, adiciona a classe. Se voltou para o topo absoluto, remove.
        if (self.direction === 1 || window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    }
});

/* =========================================
   SMOOTH SCROLL ULTRA FLUIDO COM OFFSET
========================================= */
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();

        const target = document.querySelector(link.getAttribute("href"));

        if (target) {
            gsap.to(window, {
                duration: 1.2,
                // offsetY dá o desconto da altura do header para o título não ficar escondido
                scrollTo: { y: target, offsetY: 90 }, 
                ease: "power2.inOut"
            });
        }
    });
});

/* =========================================
   HERO INTRO (CINEMÁTICO)
========================================= */
const heroTl = gsap.timeline({ defaults: { duration: 1, opacity: 0 } });

heroTl.from(".hero-tag", { y: 20, delay: 0.2 })
      .from(".hero h1", { y: 40 }, "-=0.6")
      .from(".hero p", { y: 30 }, "-=0.6")
      .from(".hero-buttons", { y: 30 }, "-=0.6")
      .from(".hero-image img", { scale: 1.05, duration: 1.2 }, "-=0.8")
      .from(".hero-numbers", { y: 30 }, "-=0.6");

/* =========================================
   SEÇÕES (SCROLL CINEMÁTICO)
========================================= */
gsap.utils.toArray(".section, .experience, .diferenciais, .location-section").forEach(section => {
    gsap.from(section, {
        opacity: 0,
        y: 60,
        duration: 1,
        scrollTrigger: {
            trigger: section,
            start: "top 85%" // Inicia a animação um pouco antes para a tela não ficar em branco
        }
    });
});

/* =========================================
   CARDS ANIMATION STAGGER
========================================= */
gsap.fromTo(".service-card", 
    { opacity: 0, y: 40 },
    {
        opacity: 1, y: 0, stagger: 0.15, duration: 1,
        scrollTrigger: { trigger: ".services-grid", start: "top 80%" }
    }
);

gsap.fromTo(".card", 
    { opacity: 0, y: 40 },
    {
        opacity: 1, y: 0, stagger: 0.15, duration: 1,
        scrollTrigger: { trigger: ".cards", start: "top 80%" }
    }
);

/* =========================================
   GALERIA PARALLAX SUAVE
========================================= */
gsap.utils.toArray(".gallery img").forEach(img => {
    gsap.from(img, {
        scale: 1.1,
        opacity: 0,
        duration: 1,
        scrollTrigger: {
            trigger: img,
            start: "top 90%"
        }
    });
});

/* =========================================
   LIGHTBOX PREMIUM (GALERIA)
========================================= */
const galleryImages = document.querySelectorAll('.gallery img');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');

if (lightbox && lightboxImg) {
    // Abrir
    galleryImages.forEach(img => {
        img.addEventListener('click', () => {
            lightboxImg.src = img.src;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden'; 
        });
    });

    // Fechar
    const fecharLightbox = () => {
        lightbox.classList.remove('active');
        setTimeout(() => {
            document.body.style.overflow = ''; // Retorna ao padrão do navegador
        }, 500); 
    };

    lightboxClose.addEventListener('click', fecharLightbox);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) fecharLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            fecharLightbox();
        }
    });
}

/* =========================================
   FAQ ACCORDION (COM ACESSIBILIDADE)
========================================= */
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        
        // Opcional: Fecha os outros itens antes de abrir o novo
        faqItems.forEach(i => {
            i.classList.remove('active');
            i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        });
        
        // Alterna o estado do item clicado
        if (!isOpen) {
            item.classList.add('active');
            question.setAttribute('aria-expanded', 'true');
        } else {
            item.classList.remove('active');
            question.setAttribute('aria-expanded', 'false');
        }
    });
});