document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. Efecto de Escritura en el Título (Prompt) ---
    const titleText = "Iniciando secuencia de comandos. Acceso concedido...";
    const titleElement = document.getElementById('main-title');
    let i = 0;

    function typeWriter() {
        if (i < titleText.length) {
            titleElement.innerHTML += titleText.charAt(i);
            i++;
            setTimeout(typeWriter, 50); // Velocidad
        } else {
            // Añade un cursor parpadeante al final
            titleElement.innerHTML += '<span style="animation: blink 1s step-end infinite;">_</span>';
        }
    }
    
    typeWriter();

    // --- 2. Efecto de Lluvia de Código Binario (Matrix 01) ---
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');

    // Configuración inicial del Canvas
    const binary = '01'; // Binario puro
    const font_size = 18;
    
    // Función para ajustar el tamaño y las gotas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const columns = canvas.width / font_size;
        
        // Mantener o inicializar las gotas
        if (drops.length === 0) {
            for (let x = 0; x < columns; x++) {
                drops[x] = 1;
            }
        } else {
            drops.length = columns; // Ajustar el tamaño si la ventana cambia
        }
    }

    let drops = [];
    resizeCanvas(); // Llamada inicial

    function drawMatrix() {
        // Rastro de las gotas (0.05 es bajo, genera un buen rastro)
        ctx.fillStyle = 'rgba(13, 2, 8, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff00';
        ctx.font = `${font_size}px monospace`;

        for (let i = 0; i < drops.length; i++) {
            const text = binary.charAt(Math.floor(Math.random() * binary.length));
            ctx.fillText(text, i * font_size, drops[i] * font_size);

            // Reinicia la columna si ha llegado abajo
            if (drops[i] * font_size > canvas.height && Math.random() > 0.98) {
                drops[i] = 0;
            }

            drops[i]++;
        }
    }

    window.addEventListener('resize', resizeCanvas); // Adaptar al cambio de tamaño
    
    setInterval(drawMatrix, 50); // Velocidad ajustada
});
