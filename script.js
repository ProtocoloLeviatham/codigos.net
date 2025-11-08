document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. Efecto de Escritura en el Título (Prompt) ---
    const titleText = "Iniciando secuencia de comandos. Acceso concedido...";
    const titleElement = document.getElementById('main-title');
    let i = 0;

    function typeWriter() {
        if (i < titleText.length) {
            // Añade la clase 'prompt' para que el texto aparezca con el estilo del prompt
            titleElement.innerHTML += titleText.charAt(i);
            i++;
            setTimeout(typeWriter, 50); // Velocidad rápida
        } else {
            // Añade un cursor parpadeante al final
            titleElement.innerHTML += '<span style="animation: blink 1s step-end infinite;">_</span>';
        }
    }
    
    typeWriter();

    // --- 2. Efecto de Lluvia de Código Binario (Matrix 01) ---
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const binary = '01'; // Solo binario puro, como solicitaste
    const font_size = 18;
    const columns = canvas.width / font_size;
    const drops = []; 

    // Inicializar 'y' para cada columna
    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }

    function drawMatrix() {
        // Fondo semitransparente oscuro
        ctx.fillStyle = 'rgba(13, 2, 8, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff00'; // Color del texto (verde neón)
        ctx.font = `${font_size}px monospace`;

        for (let i = 0; i < drops.length; i++) {
            // Caracter binario aleatorio '0' o '1'
            const text = binary.charAt(Math.floor(Math.random() * binary.length));
            ctx.fillText(text, i * font_size, drops[i] * font_size);

            // Reinicia la columna con cierta probabilidad
            if (drops[i] * font_size > canvas.height && Math.random() > 0.98) {
                drops[i] = 0;
            }

            drops[i]++;
        }
    }

    // Adaptar el canvas al tamaño de la ventana
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const newColumns = canvas.width / font_size;
        drops.length = newColumns; 
        for (let x = 0; x < newColumns; x++) {
            if (drops[x] === undefined) { 
                drops[x] = 1;
            }
        }
    });

    // Ejecuta la animación
    setInterval(drawMatrix, 50); // Velocidad ajustada para un buen rendimiento

});


