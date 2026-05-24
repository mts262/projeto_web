import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class EstacaoMeteorologicaServer {

    // =========================
    // CONFIGURAÇÕES DO SERVIDOR
    // =========================

    private static final int PORTA = 8080;

    private static final String USUARIO = "admin";
    private static final String SENHA = "123456";

    // =========================
    // SESSÕES
    // =========================

    private static final Map<String, Boolean> sessoes = new ConcurrentHashMap<>();

    // =========================
    // SENSORES
    // =========================

    private static final Map<String, Integer> sensores = new ConcurrentHashMap<>();

    // =========================
    // CONFIGURAÇÕES
    // =========================

    private static final Map<String, String> configuracoes = new ConcurrentHashMap<>();

    private static final Random random = new Random();

    public static void main(String[] args) throws Exception {

        inicializarSensores();
        inicializarConfiguracoes();

        HttpServer server = HttpServer.create(new InetSocketAddress(PORTA), 0);

        server.createContext("/aut", new AuthHandler());
        server.createContext("/get", new GetSensorHandler());
        server.createContext("/set", new SetConfigHandler());
        server.createContext("/exit", new ExitHandler());

        server.setExecutor(null);

        System.out.println("Servidor iniciado na porta " + PORTA);

        server.start();
    }

    // ============================================================
    // HANDLER DE AUTENTICAÇÃO
    // ============================================================

    static class AuthHandler implements HttpHandler {

        @Override
        public void handle(HttpExchange exchange) throws IOException {

            Map<String, String> params = queryToMap(exchange.getRequestURI());

            String usuario = params.get("usuario");
            String senha = params.get("senha");

            String resposta;

            if (usuario == null || senha == null) {

                resposta = "-2";

            } else if (usuario.equals(USUARIO) && senha.equals(SENHA)) {

                String token = UUID.randomUUID().toString();

                sessoes.put(token, true);

                resposta = "1\nTOKEN=" + token;

            } else {

                resposta = "-1";
            }

            enviarResposta(exchange, resposta);
        }
    }

    // ============================================================
    // HANDLER DE LEITURA DE SENSOR
    // ============================================================

    static class GetSensorHandler implements HttpHandler {

        @Override
        public void handle(HttpExchange exchange) throws IOException {

            Map<String, String> params = queryToMap(exchange.getRequestURI());

            String token = params.get("token");
            String sensor = params.get("sensor");

            String resposta;

            if (!sessaoValida(token)) {

                resposta = "-3";

            } else if (sensor == null || !sensores.containsKey(sensor)) {

                resposta = "-4";

            } else {

                String enabledKey;

                if (sensor.startsWith("a")) {
                    enabledKey = sensor + "Enable";
                } else {
                    enabledKey = sensor + "enable";
                }

                String habilitado = configuracoes.get(enabledKey);

                if (!"1".equals(habilitado)) {

                    resposta = "-5";

                } else {

                    // Simulação de leitura
                    int valor = gerarValorSensor(sensor);

                    sensores.put(sensor, valor);

                    resposta = "v" + valor;
                }
            }

            enviarResposta(exchange, resposta);
        }
    }

    // ============================================================
    // HANDLER DE CONFIGURAÇÃO
    // ============================================================

    static class SetConfigHandler implements HttpHandler {

        @Override
        public void handle(HttpExchange exchange) throws IOException {

            Map<String, String> params = queryToMap(exchange.getRequestURI());

            String token = params.get("token");
            String parametro = params.get("parametro");
            String valor = params.get("valor");

            String resposta;

            if (!sessaoValida(token)) {

                resposta = "-3";

            } else if (parametro == null || !configuracoes.containsKey(parametro)) {

                resposta = "-6";

            } else if (!valorValido(parametro, valor)) {

                resposta = "-7";

            } else {

                configuracoes.put(parametro, valor);

                resposta = "1";
            }

            enviarResposta(exchange, resposta);
        }
    }

    // ============================================================
    // HANDLER DE LOGOFF
    // ============================================================

    static class ExitHandler implements HttpHandler {

        @Override
        public void handle(HttpExchange exchange) throws IOException {

            Map<String, String> params = queryToMap(exchange.getRequestURI());

            String token = params.get("token");

            String resposta;

            if (!sessaoValida(token)) {

                resposta = "-3";

            } else {

                sessoes.remove(token);

                resposta = "1";
            }

            enviarResposta(exchange, resposta);
        }
    }

    // ============================================================
    // MÉTODOS AUXILIARES
    // ============================================================

    private static void enviarResposta(HttpExchange exchange, String resposta)
            throws IOException {

        // HEADERS CORS
        exchange.getResponseHeaders().add(
                "Access-Control-Allow-Origin", "*");

        exchange.getResponseHeaders().add(
                "Access-Control-Allow-Methods",
                "GET, POST, OPTIONS");

        exchange.getResponseHeaders().add(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization");

        byte[] bytes = resposta.getBytes();

        exchange.sendResponseHeaders(200, bytes.length);

        OutputStream os = exchange.getResponseBody();

        os.write(bytes);

        os.close();
    }

    private static boolean sessaoValida(String token) {

        return token != null && sessoes.containsKey(token);
    }

    private static void inicializarSensores() {

        for (int i = 1; i <= 10; i++) {
            sensores.put("a" + i, 0);
        }

        for (int i = 1; i <= 2; i++) {
            sensores.put("d" + i, 0);
        }
    }

    private static void inicializarConfiguracoes() {

        configuracoes.put("addr", "0x01");
        configuracoes.put("ntpenable", "1");
        configuracoes.put("ntpserver", "0x10");
        configuracoes.put("ntptime", "60");

        for (int i = 1; i <= 10; i++) {

            configuracoes.put("a" + i + "Enable", "1");
            configuracoes.put("a" + i + "type", "1");
            configuracoes.put("a" + i + "freq", "5");
        }

        for (int i = 1; i <= 2; i++) {

            configuracoes.put("d" + i + "enable", "1");
            configuracoes.put("d" + i + "type", "1");
            configuracoes.put("d" + i + "freq", "5");
        }
    }

    private static int gerarValorSensor(String sensor) {

        if (sensor.startsWith("a")) {

            return random.nextInt(4096);

        } else {

            return random.nextInt(2);
        }
    }

    private static boolean valorValido(String parametro, String valor) {

        if (valor == null) {
            return false;
        }

        try {

            if (parametro.equals("addr")) {

                return valor.matches("0x[0-9A-Fa-f]{2}");
            }

            if (parametro.equals("ntpenable")) {

                return valor.equals("0") || valor.equals("1");
            }

            if (parametro.equals("ntptime")) {

                Integer.parseInt(valor);
                return true;
            }

            if (parametro.contains("Enable")
                    || parametro.contains("enable")) {

                return valor.equals("0") || valor.equals("1");
            }

            if (parametro.contains("type")) {

                int v = Integer.parseInt(valor);

                return v >= 1 && v <= 7;
            }

            if (parametro.contains("freq")) {

                Integer.parseInt(valor);
                return true;
            }

        } catch (Exception e) {

            return false;
        }

        return true;
    }

    private static Map<String, String> queryToMap(URI uri) {

        Map<String, String> result = new HashMap<>();

        String query = uri.getQuery();

        if (query == null) {
            return result;
        }

        for (String param : query.split("&")) {

            String[] entry = param.split("=");

            if (entry.length > 1) {

                result.put(entry[0], entry[1]);
            }
        }

        return result;
    }
}