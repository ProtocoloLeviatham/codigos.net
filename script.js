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

    const binary = '01'; // Solo binario puro
    const font_size = 18;
    let drops = []; 

    // Función para ajustar el tamaño y las gotas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const columns = canvas.width / font_size;
        
        // Reinicializar las gotas si la orientación/tamaño cambian drásticamente
        drops = [];
        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }
    }

    resizeCanvas(); // Llamada inicial
    window.addEventListener('resize', resizeCanvas); // Adaptar al cambio de tamaño

    function drawMatrix() {
        // Fondo semitransparente oscuro para el rastro
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; 
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
    
    // Usamos requestAnimationFrame para mejor rendimiento, pero setInterval es más sencillo
    // en este contexto, lo mantendremos en 50ms para un buen equilibrio.
    setInterval(drawMatrix, 50); 
});
