function removerWidget(id) {
    $(id).fadeOut(300);
}

function toggleWidget(id) {
    if ($(id).is(':visible')) {
        $(id).appendTo('#dashboard');
    } else {
        $(id).fadeIn(300).appendTo('#dashboard');
    }
}

$(document).ready(function() {
    const urlServidor = "http://localhost:8080";
    let tokenValido = "";

    // Dados históricos simulados para alimentar os Histogramas (Séries Temporais)
    // Em passos futuros, esses arrays podem ser alimentados por leituras salvas
    const historicoChuva = [5, 12, 0, 0, 8, 15, 22, 3];
    const historicoTemp = [22, 24, 26, 25, 23, 21, 20, 22];
    const labelsHoras = ["02h", "05h", "08h", "11h", "14h", "17h", "20h", "23h"];

    function autenticarEstacao() {
        $.get(`${urlServidor}/aut?usuario=admin&senha=123456`, function(resposta) {
            if (resposta.includes("TOKEN=")) {
                tokenValido = resposta.split("TOKEN=")[1].trim();
                console.log("Autenticado! Token:", tokenValido);

                atualizarPainelCompleto();
                // Renderiza os gráficos obrigatórios da avaliação imediatamente
                desenharHistogramaSimples();
                desenharHistogramaSobreposto();

                setInterval(atualizarPainelCompleto, 5000);
            }
        }).fail(function() {
            console.error("Servidor desconectado. Renderizando gráficos com dados locais...");
            desenharHistogramaSimples();
            desenharHistogramaSobreposto();
        });
    }

    function lerSensorMeteorologico(codigoSensor, elementoHtmlId, sufixoUnidade) {
        if (!tokenValido) return;

        $.get(`${urlServidor}/get?token=${tokenValido}&sensor=${codigoSensor}`, function(respostaBruta) {
            let valorLimpo = respostaBruta.replace('v', '').trim();
            $(`#${elementoHtmlId}`).html(`${valorLimpo}<span class="data-unit">${sufixoUnidade}</span>`);

            // REQUISITO: Indicador Visual Instantâneo Dinâmico
            if(codigoSensor === "a3") {
                // Normaliza o valor para base de porcentagem (0-100%)
                let porcentagem = Math.min(Math.max(parseInt(valorLimpo), 0), 100);
                $("#bar-luminosidade").css("width", `${porcentagem}%`);
            }
        });
    }

    // REQUISITO: Histograma para série temporal simples
    function desenharHistogramaSimples() {
        const canvas = document.getElementById('chart-chuva');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const larguraBarra = 25;
        const espacamento = 12;
        const margemEsquerda = 20;

        for (let i = 0; i < historicoChuva.length; i++) {
            let alturaBarra = historicoChuva[i] * 4; // Fator de escala visual
            let x = margemEsquerda + i * (larguraBarra + espacamento);
            let y = canvas.height - alturaBarra - 20;

            // Desenha a barra do Histograma
            ctx.fillStyle = '#3498db';
            ctx.fillRect(x, y, larguraBarra, alturaBarra);

            // Texto com o valor acima da barra
            ctx.fillStyle = '#2c3e50';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${historicoChuva[i]}mm`, x - 2, y - 5);

            // Legenda do tempo no eixo X
            ctx.fillText(labelsHoras[i], x, canvas.height - 5);
        }
    }

    // REQUISITO: Histograma para séries temporais sobrepostas (Chuva vs Temperatura)
    function desenharHistogramaSobreposto() {
        const canvas = document.getElementById('chart-sobreposto');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const larguraBarra = 25;
        const espacamento = 12;
        const margemEsquerda = 20;

        for (let i = 0; i < historicoChuva.length; i++) {
            let x = margemEsquerda + i * (larguraBarra + espacamento);

            // 1ª Série: Chuva (Barra Azul ao Fundo)
            let altChuva = historicoChuva[i] * 4;
            let yChuva = canvas.height - altChuva - 20;
            ctx.fillStyle = 'rgba(52, 152, 219, 0.6)'; // Azul semitransparente
            ctx.fillRect(x, yChuva, larguraBarra, altChuva);

            // 2ª Série Sobreposta: Temperatura (Barra Laranja mais fina na frente)
            let altTemp = historicoTemp[i] * 3;
            let yTemp = canvas.height - altTemp - 20;
            ctx.fillStyle = 'rgba(230, 126, 34, 0.8)'; // Laranja sobreposto
            ctx.fillRect(x + 5, yTemp, larguraBarra - 10, altTemp);

            // Legenda de tempo fixa no eixo X
            ctx.fillStyle = '#2c3e50';
            ctx.font = '9px sans-serif';
            ctx.fillText(labelsHoras[i], x, canvas.height - 5);
        }

        // Mini Legenda indicativa no topo do gráfico
        ctx.fillStyle = '#3498db'; ctx.fillRect(10, 10, 10, 10);
        ctx.fillStyle = '#2c3e50'; ctx.fillText("Chuva", 25, 18);
        ctx.fillStyle = '#e67e22'; ctx.fillRect(70, 10, 10, 10);
        ctx.fillStyle = '#2c3e50'; ctx.fillText("Temp", 85, 18);
    }

    function atualizarPainelCompleto() {
        lerSensorMeteorologico("a1", "val-temp", "°C");
        lerSensorMeteorologico("a2", "val-pressao", " hPa");
        lerSensorMeteorologico("a3", "val-luminosidade", " Lux");
    }

    autenticarEstacao();

    // Função auxiliar para atualizar o Google Maps na tela dinamicamente
        function atualizarMapaGoogle(latitude, longitude) {
            // Altera o atributo src do iframe injetando as novas coordenadas capturadas
            const novaUrlMapa = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
            $("#google-maps-frame").attr("src", novaUrlMapa);

            // Atualiza a legenda de texto abaixo do mapa
            $("#val-geo").text(`Lat: ${latitude} | Lon: ${longitude}`);
        }

        // Dentro da sua função atualizarPainelCompleto, você pode disparar a atualização.
        // Para fins acadêmicos e testes, podemos passar coordenadas simuladas ou vindas de variáveis do servidor:
        function atualizarPainelCompleto() {
            console.log("Atualizando dados dos sensores...");
            lerSensorMeteorologico("a1", "val-temp", "°C");
            lerSensorMeteorologico("a2", "val-pressao", " hPa");
            lerSensorMeteorologico("a3", "val-luminosidade", " Lux");
        }

        atualizarMapaGoogle("-12.9714", "-38.5014");
});