---
layout: post
title: Codex Multi-Provider Free Proxy
date: 2026-11-12 09:43:16
description: How to create a custom proxy for Open Router to use free IA Models
tags: IA
categories: IA
---

# Codex Multi-Provider Free Proxy

Proxy local compatible con la API de OpenAI Responses, diseñado para conectar Codex CLI con modelos gratuitos de OpenRouter y, opcionalmente, Groq.

Permite centralizar la selección de modelos, gestionar varias API keys, aplicar mecanismos de recuperación ante errores y adaptar las peticiones de Codex a las APIs de los proveedores.

> **Versión documentada:** 3.4.0  
> **Estado:** compilación y pruebas simuladas realizadas. No se garantiza la compatibilidad de todas las peticiones sin validación real con las cuentas de los proveedores.

## Características

- Proxy local basado en FastAPI.
- Compatibilidad con Codex CLI mediante Responses API.
- Catálogo dinámico de modelos de OpenRouter.
- Filtrado de modelos gratuitos de OpenRouter.
- Integración opcional con Groq.
- Rotación de API keys.
- Cooldowns por clave, modelo y proveedor.
- Gestión de errores HTTP y límites de cuota.
- Bloqueo global cuando se alcanza la cuota diaria de OpenRouter.
- Sesión configurable de hasta 8 horas.
- Adaptación de herramientas `namespace` de Codex a funciones compatibles con Groq.
- Reconstrucción de namespaces en las respuestas de herramientas.
- Adaptación de herramientas web search.
- Fallback hacia `compound-beta` cuando está disponible en el catálogo de Groq.
- Endpoint de salud del proxy.
- Logs locales.

## Arquitectura

```text
Codex CLI
   |
   | OpenAI Responses API
   | http://127.0.0.1:8787/v1
   |
   v
FastAPI Local Proxy
   |
   |-- OpenRouter
   |     |-- Catálogo dinámico de modelos gratuitos
   |     |-- Rotación de API keys
   |     |-- Gestión de cuotas
   |     |-- Cooldowns
   |
   |-- Groq (opcional)
         |-- Modelos permitidos explícitamente
         |-- Adaptación de herramientas
         |-- Fallback ante errores de TPM
         |-- compound-beta, si está disponible
```

## Requisitos

- Python 3.11 o superior.
- Codex CLI.
- Una API key de OpenRouter.
- Opcionalmente, una API key de Groq.
- Windows 11 o Fedora Linux.

## Estructura del repositorio

```text
codex-multi-provider-free-proxy/
├── proxy.py
├── .env.example
├── .gitignore
├── requirements.txt
├── run.ps1
├── README.md
└── tests/
```

El archivo `proxy.py` contiene la implementación completa del proxy.

## Instalación en Windows 11

### 1. Crear el directorio

```powershell
mkdir C:\AI\OpenRouterProxy
cd C:\AI\OpenRouterProxy
```

Copiar al directorio el archivo `proxy.py`.

### 2. Crear el entorno virtual

```powershell
py -3 -m venv .venv

.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
```

### 3. Instalar dependencias

```powershell
pip install -r requirements.txt
```

Contenido de `requirements.txt`:

```text
fastapi
uvicorn[standard]
httpx
python-dotenv
```

### 4. Configurar las variables de entorno

Crear el archivo `.env` a partir de `.env.example`.

## Configuración de `.env`

```dotenv
# OpenRouter: obligatorio
OPENROUTER_API_KEYS=sk-or-v1-REEMPLAZAR

# Groq: opcional
GROQ_API_KEYS=

# Modelos Groq permitidos explícitamente.
# Comprobar previamente los IDs disponibles en la cuenta.
GROQ_FREE_MODELS=

# Token local del proxy
LOCAL_API_KEY=REEMPLAZAR_POR_TOKEN_SEGURO

# Configuración del proxy
PORT=8787
SESSION_HOURS=8

# Filtro del catálogo OpenRouter
MODEL_FILTER=free

# Caché del catálogo, en segundos
MODEL_CACHE_SECONDS=300

# Nivel de logging
LOG_LEVEL=INFO
```

### Generar un token local

En PowerShell:

```powershell
$token = [Convert]::ToHexString(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
)

$token
```

Asignar el token generado a `LOCAL_API_KEY`.

El token local es distinto de las claves de OpenRouter y Groq.

## Configuración de Codex CLI

Codex debe apuntar al proxy local, no directamente a OpenRouter.

### 1. Configurar la variable de entorno

En PowerShell:

```powershell
$env:CODEX_PROXY_TOKEN="EL_TOKEN_LOCAL_CONFIGURADO_EN_ENV"
```

Para persistirla en el usuario de Windows:

```powershell
[Environment]::SetEnvironmentVariable(
    "CODEX_PROXY_TOKEN",
    "EL_TOKEN_LOCAL_CONFIGURADO_EN_ENV",
    "User"
)
```

Después de establecerla de forma persistente, abrir una nueva terminal.

### 2. Configurar `config.toml`

Ubicación habitual:

```text
%USERPROFILE%\.codex\config.toml
```

Configuración:

```toml
model_provider = "openrouter-proxy"
model = "openrouter/free"
model_reasoning_effort = "high"

[model_providers.openrouter-proxy]
name = "OpenRouter Local Proxy"
base_url = "http://127.0.0.1:8787/v1"
wire_api = "responses"
env_key = "CODEX_PROXY_TOKEN"
```

La variable `CODEX_PROXY_TOKEN` debe contener el mismo secreto que `LOCAL_API_KEY` en el `.env` del proxy.

## Arranque del proxy

### Windows PowerShell

Desde el directorio del proyecto:

```powershell
.\.venv\Scripts\Activate.ps1

uvicorn proxy:app --host 127.0.0.1 --port 8787
```

El proxy estará disponible en:

```text
http://127.0.0.1:8787/v1
```

### Verificar el estado

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8787/health"
```

### Consultar modelos

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8787/v1/models" `
    -Headers @{
        Authorization = "Bearer $env:CODEX_PROXY_TOKEN"
    }
```

## Fedora Linux

### 1. Crear el entorno

```bash
mkdir -p ~/apps/openrouter-proxy
cd ~/apps/openrouter-proxy

python3 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Proteger el archivo `.env`

```bash
chmod 600 .env
```

### 3. Ejecutar

```bash
source .venv/bin/activate

uvicorn proxy:app --host 127.0.0.1 --port 8787
```

## Integración opcional con Groq

Groq es opcional. Para activarlo:

1. Añadir la API key a `GROQ_API_KEYS`.
2. Configurar explícitamente los modelos gratuitos autorizados en `GROQ_FREE_MODELS`.
3. Verificar los IDs y las cuotas disponibles en la cuenta.
4. Reiniciar el proxy.

El proxy no debe asumir que todos los modelos publicados por Groq son gratuitos.

### Fallback `compound-beta`

La versión 3.4.0 incorpora `compound-beta` como fallback de mayor capacidad TPM.

El proxy lo incorpora a la lista permitida y comprueba su disponibilidad en el catálogo de Groq antes de utilizarlo.

La disponibilidad, las cuotas y los límites efectivos dependen de la cuenta y pueden cambiar.

## Endpoints

| Endpoint | Método | Descripción |
|---|---|---|
| `/health` | GET | Estado del proxy |
| `/v1/models` | GET | Catálogo de modelos |
| `/v1/responses` | POST | Responses API compatible con Codex |
| `/v1/chat/completions` | POST | Chat Completions |

## Prueba de Responses API

### PowerShell

```powershell
$body = @{
    model = "openrouter/free"
    input = "Escribe una función Java que compruebe si un número es primo."
    max_output_tokens = 500
} | ConvertTo-Json -Depth 20

Invoke-RestMethod `
    -Uri "http://127.0.0.1:8787/v1/responses" `
    -Method Post `
    -Headers @{
        Authorization = "Bearer $env:CODEX_PROXY_TOKEN"
    } `
    -ContentType "application/json" `
    -Body $body
```

## Seguridad

- No publicar el archivo `.env`.
- No publicar API keys de OpenRouter ni Groq.
- No publicar el token local del proxy.
- No exponer el proxy a Internet.
- Mantener el proxy escuchando en `127.0.0.1`.
- Evitar incluir tokens en logs o capturas.
- Cambiar inmediatamente cualquier secreto que haya sido publicado.

### `.gitignore`

```gitignore
.env
.venv/
__pycache__/
*.pyc
proxy.log
session.started
```

## Limitaciones conocidas

- La disponibilidad de modelos gratuitos depende de cada proveedor.
- La rotación de claves no elimina las cuotas compartidas por cuenta u organización.
- Groq puede rechazar peticiones por límites de TPM, RPM o incompatibilidad de herramientas.
- `compound-beta` puede no estar disponible en todas las cuentas.
- Las pruebas simuladas no sustituyen una ejecución real con las API keys del usuario.
- La compatibilidad con herramientas complejas de Codex debe validarse con cada proveedor.
- No se garantiza que todos los modelos gratuitos soporten las mismas capacidades.

## Versiones

### v3.4.0

- Fallback `compound-beta` para errores 413 por límites TPM.
- Comprobación de disponibilidad del modelo en el catálogo de Groq.
- Adaptación del fallback para herramientas externas de Codex.
- Prueba simulada de transición desde modelos con límite TPM inferior.

### v3.3.0

- Conversión de herramientas namespace a funciones.
- Reconstrucción de namespace en respuestas.
- Adaptación de historial de herramientas.
- Compatibilidad con streaming SSE en la adaptación.
- Conversión de web search.
- Exclusión de modelos incompatibles con herramientas integradas.

### v3.2.0

- Normalización de estructuras de entrada, salida y herramientas.
- Correcciones de compatibilidad con Responses API.

### v3.1.0

- Normalización de campos incompatibles con Codex.
- Corrección de IDs ausentes en llamadas a funciones.

## Referencias

- [OpenRouter API Reference](https://openrouter.ai/docs/api-reference/overview)
- [OpenRouter Rate Limits](https://openrouter.ai/docs/api-reference/limits)
- [OpenRouter Responses API](https://openrouter.ai/docs/api-reference/responses)
- [Groq API Documentation](https://console.groq.com/docs)
- [Groq Rate Limits](https://console.groq.com/docs/rate-limits)
- [Codex Configuration](https://developers.openai.com/codex/config/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## Licencia

Añadir la licencia correspondiente antes de publicar el repositorio.
