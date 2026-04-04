# ARQUITECTURA: BALIO - Gestor Personal de Finanzas

## Índice
1. [Visión General](#visión-general)
2. [Backend (Spring Boot + Java)](#backend-spring-boot--java)
3. [Frontend (React + TypeScript)](#frontend-react--typescript)
4. [Flujos Clave](#flujos-clave)
5. [Gestión de Sesiones](#gestión-de-sesiones)
6. [Internacionalización (i18n)](#internacionalización-i18n)
7. [Base de Datos](#base-de-datos)
8. [Seguridad](#seguridad)
9. [Enable Banking: Integración PSD2/Open Banking](#enable-banking-integración-psd2open-banking-completa)
10. [Transiciones Animadas: GSAP en MainPage2](#transiciones-animadas-gsap-en-mainpage2)
11. [Widgets Dinámicos: Analysis Page](#widgets-dinámicos-analysis-page-gráficos-redimensionables)
12. [Importar/Exportar CSV](#importarexportar-csv)
13. [OAuth Tokens: Flujo Completo y Seguridad](#oauth-tokens-flujo-completo-y-seguridad)
14. [Desarrollo vs. Producción](#desarrollo-vs-producción)
15. [Resumen: Acciones Clave](#resumen-acciones-clave-del-usuario)

---

## Visión General

**Balio** es una aplicación full-stack que permite a los usuarios:
- Gestionar cuentas bancarias y no bancarias
- Registrar transacciones (gastos e ingresos)
- Crear presupuestos y metas de ahorro
- Enlazar bancos a través de Enable Banking (PSD2)
- Visualizar análisis mediante gráficos y filtros
- Programar transacciones recurrentes

**Stack tecnológico:**
- **Backend:** Spring Boot 3.x, Java 17+, PostgreSQL, Flyway, JWT
- **Frontend:** React 19, TypeScript, React Router, Vite, i18next, Axios
- **Integraciones externas:** Enable Banking (open banking), Frankfurter (tipos de cambio)

---

## Backend (Spring Boot + Java)

### Estructura de directorios

```
backend/src/main/java/Balio/web/
├── config/              # Configuración (Flyway, JWT, CORS, Seguridad)
├── model/
│   ├── entities/        # Entidades JPA (User, Account, Transaction, etc.)
│   ├── services/        # Lógica de negocio (CRUD, validaciones, cálculos)
│   ├── daos/            # Acceso a datos (Spring Data JPA)
│   ├── exceptions/      # Excepciones personalizadas
│   ├── converters/      # Mapeo Entity ↔ DTO
├── rest/
│   ├── controllers/     # Endpoints REST (UserController, TransactionController, etc.)
│   ├── dtos/            # Data Transfer Objects
│   ├── common/          # JWT Filter, error handlers
├── enablebanking/       # Integración Enable Banking
└── enums/               # TransactionType, AccountType, etc.
```

### Configuración (Config)

#### 1. **FlywayConfig.java**
- **Propósito:** Automigrar la base de datos al arrancar la app
- **Cómo funciona:**
  - Lee archivos SQL en `classpath:db/migration` (por ej. `V1__initial.sql`)
  - Ejecuta migraciones en orden alfanumérico
  - `baselineOnMigrate=true` permite bases existentes
  - Se puede desactivar con `spring.flyway.enabled=false`

#### 2. **SecurityConfig.java**
- **Propósito:** Definir política de autenticación y autorización
- **Flujo:**
  - CORS habilitado desde `http://localhost:5173` (frontend)
  - Modo `STATELESS` → sin sesiones, usa JWT
  - Rutas públicas: `/user/login`, `/user/signUp`, `/user/refreshToken`, `/bank/enablebanking/callback`, `/v3/api-docs/**`, `/swagger-ui/**`
  - Rutas protegidas: todas las demás requieren autenticación
  - Todo request pasa por `JwtFilter` antes de `UsernamePasswordAuthenticationFilter`

#### 3. **JwtFilter**
- Extrae el token JWT del header `Authorization: Bearer <token>`
- Valida la firma del JWT
- Si es válido, crea un `UsernamePasswordAuthenticationToken` con el `userId`
- Spring Security luego lo usa para validar acceso a rutas protegidas

#### 4. **JacksonConfig.java**
- Configura `ObjectMapper` para serializar/deserializar tipos `java.time` (LocalDate, Instant, etc.) como strings ISO-8601, no como timestamps

#### 5. **ScheduledTasks.java**
- Tarea cron que cada 6 horas (`0 0 */6 * * *`) limpia tokens de refresco expirados
- Llamada: `RefreshTokenService.purgeExpiredTokens()`

#### 6. **SecurityEnvironmentValidator.java**
- Al arrancar, valida que la clave JWT y contraseña de BD no sean valores por defecto inseguros
- Si lo son, escribe avisos en logs

#### 7. **OpenApiConfig.java**
- Anotaciones para documentación Swagger/OpenAPI
- Define el esquema de seguridad `bearerAuth` (JWT)
- UI disponible en `/swagger-ui.html` (público, considerarproteger en producción)

### Servicios (Services)

#### Capas de servicios por dominio:

**UserService / RefreshTokenService**
- Registro, login, cambio de contraseña, gestión de refresh tokens
- Validaciones de email duplicado, contraseña débil
- Rate limiting en login (prevención de fuerza bruta)
- Rotación de tokens: al refrescar, se revoca el anterior

**AccountService**
- CRUD de cuentas (create, modify, delete)
- Tipos: CASH, BANK, CREDIT_CARD, etc.
- Cuenta "default" para transacciones sin especificar cuenta
- Limpieza en cascada: al borrar cuenta, se borran conexiones bancarias, reglas, y transacciones

**TransactionService**
- Crear gastos/ingresos
- Conversión de divisa opcional
- Actualiza saldo de la cuenta automáticamente
- Búsqueda con filtros (tipo, categoría, cuenta, fechas)
- Export/import CSV
- Batch rules: renombrar/recategorizar múltiples transacciones

**CategoryService**
- CRUD de categorías (organizadas por usuario y tipo: INCOME, EXPENSE)
- Paginado

**BudgetService**
- Crear presupuestos con periodicidad (MONTHLY, QUARTERLY, YEARLY)
- Subcategorías dentro de cada presupuesto con límites de gastos
- Auto-link de transacciones: categorías vinculadas al presupuesto se incluyen automáticamente
- Manual link: asociar una transacción a un presupuesto
- Cálculo de gasto actual vs. límite por categoría

**GoalService**
- Crear metas de ahorro con cantidad objetivo
- Añadir/retirar dinero
- Validaciones: no negativo, propiedad del usuario

**ScheduledTransactionService**
- Crear transacciones recurrentes (reglas con frecuencia: años, meses, semanas, días)
- Calcular fechas pendientes
- Generar transacciones ejecutadas periódicamente (tarea manual o scheduled)
- Actualiza saldos si `affectsBalance=true`

**FilterService**
- Guardar filtros complejos (JSON con condiciones: categorías, rango de montos, fechas, etc.)
- Aplicar filtro: restaura transacciones filtradas en memoria
- Reutilizable en widgets

**ExchangeRateService / FrankfurterExchangeRateService**
- Obtener tipos de cambio de API Frankfurter
- Caché en memoria (TTL 1h): si la petición falla, devuelve la última conocida

**BankService / EnableBankingSyncService**
- Integración con Enable Banking (PSD2 / Open Banking)
- Flujo OAuth: usuario autentica en su banco, vuelve con código
- Crear `BankConnection` asociada a una cuenta
- Sincronizar transacciones del banco en la BD local
- Deduplicación por `externalId`
- Aplicar reglas de mapeo: normalizar nombres y categorías de transacciones importadas

**WidgetService / WidgetDataResolverService / WidgetFilterEngine**
- Crear widgets (gráficos para el dashboard)
- Tipos: CHART (línea, barra, dona), KPI, TABLE
- Configuración JSON: filtros, groupBy, metric (SUM, AVG, COUNT, NET)
- Preview: mostrar datos sin guardar
- Caché de previews para optimizar

### Controladores REST (Controllers)

#### UserController
- `POST /user/signUp`: Registrar usuario (nickname, email, contraseña)
- `POST /user/login`: Login (email, contraseña) → devuelve `AuthenticatedUserDto` con accessToken, refreshToken y datos del usuario
- `POST /user/refreshToken`: Refrescar accessToken usando refreshToken
- `POST /user/logout`: Revocar todos los refresh tokens del usuario
- `PUT /user/{id}`: Actualizar perfil (nickname, email)
- `PUT /user/{id}/preferredCurrency`: Cambiar divisa preferida
- `POST /user/{id}/changePassword`: Cambiar contraseña (revoca todos los tokens por seguridad)
- `DELETE /user/{id}`: Borrar cuenta y todos sus datos

#### AccountController
- `GET /account`: Listar cuentas del usuario
- `GET /account/{accountId}`: Detalle de una cuenta
- `POST /account`: Crear cuenta (nombre, tipo, divisa, setDefault)
- `PUT /account/{accountId}`: Actualizar cuenta
- `DELETE /account/{accountId}`: Borrar cuenta
- `PATCH /account/{accountId}/balance`: Ajustar saldo (solo cuentas no bancarias)
- `PUT /account/{accountId}/setDefault`: Establecer como cuenta default

#### TransactionController
- `GET /transaction`: Listar transacciones (paginado, filtrable por tipo, cuenta, categoría, fechas)
- `GET /transaction/{transactionId}`: Detalle de transacción
- `POST /transaction/expense`: Crear gasto
- `POST /transaction/income`: Crear ingreso
- `PUT /transaction/{transactionId}`: Actualizar transacción
- `DELETE /transaction/{transactionId}`: Borrar transacción
- `POST /transaction/apply-rules`: Aplicar reglas batch
- `GET /transaction/export/csv`: Exportar transacciones a CSV
- `POST /transaction/import/csv`: Importar transacciones desde CSV

#### CategoryController
- `GET /category`: Listar categorías del usuario
- `GET /category/paged`: Versión paginada
- `GET /category/{categoryId}`: Detalle
- `POST /category/create`: Crear categoría
- `PUT /category/{categoryId}`: Actualizar
- `DELETE /category/{categoryId}`: Borrar

#### BudgetController
- `GET /budget`: Listar presupuestos
- `GET /budget/{budgetId}`: Detalle (incluye subcategorías y gasto actual)
- `POST /budget`: Crear presupuesto
- `PUT /budget/{budgetId}`: Actualizar
- `DELETE /budget/{budgetId}`: Borrar
- `POST /budget/{budgetId}/category`: Crear subcategoría dentro de presupuesto
- `PUT /budget/{budgetId}/category/{categoryId}`: Actualizar subcategoría
- `DELETE /budget/{budgetId}/category/{categoryId}`: Borrar subcategoría
- `POST /budget/{budgetId}/category/{categoryId}/link`: Asociar transacción manual
- `DELETE /budget/{budgetId}/category/{categoryId}/link/{transactionId}`: Desasociar

#### GoalController
- `GET /goal`: Listar metas
- `GET /goal/{goalId}`: Detalle
- `POST /goal`: Crear meta
- `PUT /goal/{goalId}`: Actualizar
- `DELETE /goal/{goalId}`: Borrar
- `POST /goal/{goalId}/add`: Añadir dinero
- `POST /goal/{goalId}/withdraw`: Retirar dinero

#### ScheduledTransactionController
- `GET /scheduled-transaction`: Listar programadas (paginado)
- `GET /scheduled-transaction/{id}`: Detalle
- `POST /scheduled-transaction`: Crear
- `PUT /scheduled-transaction/{id}`: Actualizar
- `DELETE /scheduled-transaction/{id}`: Borrar
- `POST /scheduled-transaction/fire`: Generar transacciones pendientes

#### ChartController (Widgets)
- `GET /chart`: Listar widgets del usuario
- `GET /chart/paged`: Versión paginada
- `GET /chart/{widgetId}`: Detalle
- `POST /chart`: Crear widget (definir tipo, chart type, configuración)
- `PUT /chart/{widgetId}`: Actualizar widget
- `DELETE /chart/{widgetId}`: Borrar
- `POST /chart/{widgetId}/preview`: Ver datos del widget guardado
- `POST /chart/preview`: Ver datos usando configuración en-línea (sin guardar)
- `POST /chart/sync`: Sincronizar caché de previews

#### FilterController
- `GET /filter`: Listar filtros guardados
- `GET /filter/paged`: Versión paginada
- `GET /filter/{filterId}`: Detalle
- `POST /filter`: Crear filtro (nombre, definición JSON)
- `PUT /filter/{filterId}`: Actualizar
- `DELETE /filter/{filterId}`: Borrar
- `POST /filter/{filterId}/apply`: Aplicar filtro y devolver transacciones

#### BankController (Enable Banking)
- `GET /bank/enablebanking/aspsps`: Listar bancos disponibles (ASPSPs)
- `GET /bank/enablebanking/connect/{accountId}`: Iniciar flujo de conexión bancaria
- `GET /bank/enablebanking/callback`: Callback después de autenticación en el banco (público, sin JWT)
- `GET /bank/accounts/{accountId}/status`: Estado de la conexión bancaria
- `POST /bank/accounts/{accountId}/sync`: Sincronizar transacciones de una cuenta
- `POST /bank/sync-stale`: Sincronizar cuentas que no se han sincronizado en N minutos
- `POST /bank/sync-all`: Sincronizar todas las cuentas del usuario
- `DELETE /bank/accounts/{accountId}/link`: Desenlazar cuenta bancaria
- `GET /bank/accounts/{accountId}/rules`: Listar reglas de mapeo para una cuenta
- `POST /bank/accounts/{accountId}/rules`: Crear regla de mapeo
- `PUT /bank/accounts/{accountId}/rules/{ruleId}`: Actualizar regla
- `DELETE /bank/accounts/{accountId}/rules/{ruleId}`: Borrar regla

#### ExchangeRateController
- `GET /exchange-rate?from=EUR&to=USD`: Obtener tipo de cambio
- `GET /exchange-rate/latest?base=EUR`: Obtener matriz de tipos para una divisa base

### DTOs (Data Transfer Objects)

Los DTOs es trasladan entre Controller y Frontend, separando la lógica interna de la API pública:

**AuthenticatedUserDto**
```json
{
  "id": "uuid",
  "nickname": "Juan",
  "email": "juan@example.com",
  "preferredCurrency": "EUR",
  "accessToken": "token",
  "refreshToken": "token"
}
```

**TransactionResponseDto** / **TransactionSummaryDto**
- Full: incluye todos los campos
- Summary: reducido para listas

**BudgetResponseDto**
- Incluye subcategorías con gasto actual vs. límite

---

## Frontend (React + TypeScript)

### Estructura de directorios

```
frontend/src/
├── main.tsx                  # Entrada: carga AuthProvider + Router
├── App.tsx                   # (Deprecated) 
├── app/
│   ├── router.tsx            # Define rutas públicas/protegidas
│   ├── ProtectedRoute.tsx    # Componente wrapper para rutas autenticadas
│   └── PublicRoute.tsx       # Componente wrapper para rutas públicas
├── contexts/
│   └── AuthContext.tsx       # Contexto global de autenticación y sesión
├── config/
│   ├── routes.ts             # Constantes de rutas
│   └── nav.ts                # Configuración de navegación
├── lib/
│   ├── session.ts            # Gestión de sesión, tokens, localStorage
│   └── utils.ts              # Utilidades varias
├── backend/                  # Servicios HTTP hacia la API
│   ├── api.ts                # Cliente Axios con interceptores
│   ├── authService.ts        # Endpoints de autenticación
│   ├── transactionService.ts # Endpoints de transacciones
│   ├── accountService.ts     # Endpoints de cuentas
│   ├── categoryService.ts    # etc.
│   └── ...
├── i18n/                     # Internacionalización
│   ├── index.ts              # Inicialización de i18next
│   ├── en.json               # Traducciones inglés
│   ├── es.json               # Traducciones español
│   └── gal.json              # Traducciones gallego
├── components/
│   ├── layout/               # Layout principal, sidebars, headers
│   ├── ui/                   # Componentes reutilizables (botones, inputs, etc.)
│   ├── transactions/         # Componentes para transacciones
│   ├── budgets/              # Componentes para presupuestos
│   └── ...
├── pages/                    # Páginas completas (una por ruta)
│   ├── mainPage/
│   ├── auth/
│   ├── dashboard/
│   ├── analysis/
│   ├── transactions/
│   └── ...
├── styles/                   # Hojas de estilos CSS globales
├── types/                    # TypeScript interfaces (normalmente generadas desde backend DTOs)
└── __tests__/                # Tests unitarios
```

### Entry Point (main.tsx)

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { router } from "@/app/router";
import "@/i18n";  // Inicia i18next
import "@/styles/main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
```

**Orden de inicialización:**
1. React crea la raíz DOM
2. Carga i18n (internacionalización)
3. AuthProvider envuelve todo (gestiona sesión, autenticación)
4. RouterProvider proporciona React Router
5. Las rutas se resuelven en función del estado de autenticación

### AuthContext (contexto/contexts/AuthContext.tsx)

**Responsabilidades:**
- Verificar si hay una sesión activa al cargar la app
- Mantener estado del usuario autenticado
- Manejar login, logout, signup
- Detectar inactividad
- Advertir antes de expiración
- Refrescar tokens automáticamente

**Estado principal:**
```typescript
interface AuthState {
  user: User | null;           // Datos del usuario
  isAuthenticated: boolean;    // ¿Hay sesión?
  isLoading: boolean;          // ¿Cargando?
}

interface AuthContextValue extends AuthState {
  login: (params: LoginParamsDto) => Promise<void>;
  signUp: (params: UserDto) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}
```

**Flujo de inicialización en AuthProvider:**
1. `useEffect` al montar: cargar usuario de localStorage (sesión anterior)
2. Si hay usuario, validar que el token no esté expirado
3. Si está expirado, intentar refrescar con el refresh token
4. Si falla, mostrar toast y limpiar sesión
5. Suscribirse a eventos de sesión (cambios en tokens, expiración)

**Gestión de inactividad:**
- Cada 30 segundos, verifica si el usuario estuvo inactivo > 15 minutos
- Si falta < 5 minutos para la expiración, muestra alerta
- Si expira, limpia sesión y redirige a login

### Session Library (lib/session.ts)

**Funciones principales:**
- `getAccessToken()` / `getRefreshToken()`: Leer tokens de localStorage
- `persistSession(user, accessToken, refreshToken)`: Guardar en localStorage
- `refreshSessionTokens()`: Llamar al backend para obtener nuevo accessToken
- `clearAllUserState()`: Borrar todos los datos del usuario
- `touchSessionActivity()`: Actualizar timestamp de última actividad (throttled)
- `isAccessTokenExpiringSoon()`: Decodificar JWT y verificar `exp`

**Almacenamiento (localStorage):**
```
accessToken       → "eyJhb..."  (JWT de acceso, 15 min)
refreshToken      → "rnd64..."  (Base64, 7 días)
user              → { id, nickname, email, preferredCurrency }
sessionLastActivityAt → 1234567890 (timestamp Unix)
```

### API Client (backend/api.ts)

**Configuración de Axios con interceptores:**

**Request interceptor:**
- Inyecta el `accessToken` en cada request
- Header: `Authorization: Bearer <token>`

**Response interceptor:**
- Si el status es 401 (Unauthorized):
  - Cola peticiones que fallan mientras se refresca
  - Intenta refrescar el token con `/user/refreshToken`
  - Reintentar la petición original con el nuevo token
  - Si el refresh también falla, rechaza todas las peticiones en cola → logout

**Ejemplo de flujo:**
1. Request a `GET /transaction` con accessToken "A"
2. Token expirado en backend → respuesta 401
3. Interceptor intenta `POST /user/refreshToken` con refreshToken "R"
4. Backend devuelve nuevo accessToken "B"
5. Interceptor reintenta `GET /transaction` con token "B"
6. Request exitoso

### Services (backend/*.ts)

Cada servicio es un wrapper sobre el cliente Axios:

**authService.ts**
```typescript
export const authService = {
  signUp: (dto: UserDto) => api.post("/user/signUp", dto),
  login: (dto: LoginParamsDto) => api.post("/user/login", dto),
  refreshToken: (dto: RefreshTokenRequestDto) => api.post("/user/refreshToken", dto),
  logout: () => api.post("/user/logout"),
  updateProfile: (userId: string, dto: UserDto) => api.put(`/user/${userId}`, dto),
};
```

**transactionService.ts**
```typescript
export const transactionService = {
  getAll: (filters) => api.get("/transaction", { params: filters }),
  getById: (id) => api.get(`/transaction/${id}`),
  addExpense: (dto) => api.post("/transaction/expense", dto),
  addIncome: (dto) => api.post("/transaction/income", dto),
  update: (id, dto) => api.put(`/transaction/${id}`, dto),
  delete: (id, revert) => api.delete(`/transaction/${id}`, { params: { revertBalance: revert } }),
  exportCsv: (accountId) => api.get("/transaction/export/csv", { params: { accountId } }),
  importCsv: (file, rules) => api.post("/transaction/import/csv", { file, rules }),
};
```

Todos los servicios siguen el mismo patrón: envoltura sobre Axios → facilita testing y separación de responsabilidades.

### Router (app/router.tsx)

Define la estructura de rutas públicas y protegidas:

```typescript
export const router = createBrowserRouter([
  // Rutas públicas (redirige a dashboard si autenticado)
  {
    element: <PublicRoute />,
    children: [
      { path: ROUTES.HOME,   element: <MainPage /> },
      { path: ROUTES.LOGIN,  element: <LoginPage /> },
      { path: ROUTES.SIGNUP, element: <SignUpPage /> },
    ],
  },

  // Rutas protegidas (requiere autenticación)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,  // Layout con sidebar, header
        children: [
          { path: ROUTES.DASHBOARD,    element: <DashboardPage /> },
          { path: ROUTES.TRANSACTIONS, element: <TransactionsPage /> },
          { path: ROUTES.ANALYSIS,     element: <AnalysisPage /> },
          ...
        ],
      },
    ],
  },
]);
```

**ProtectedRoute.tsx:**
- Si `isAuthenticated` → renderiza `<Outlet />` (muestra las rutas hijas protegidas)
- Si no → redirige a `/login`

**PublicRoute.tsx:**
- Si `isAuthenticated` → redirige a `/dashboard`
- Si no → renderiza `<Outlet />` (muestra la ruta pública)

### Internacionalización (i18n)

**Inicialización (i18n/index.ts):**
```typescript
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import es from "./es.json";
import gal from "./gal.json";

i18next.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es }, gal: { translation: gal } },
  lng: navigator.language.split("-")[0] || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
```

**Uso en componentes:**
```typescript
import { useTranslation } from "react-i18next";

export function MyComponent() {
  const { t, i18n } = useTranslation();
  
  return <h1>{t("common.welcome")}</h1>;  // Lee "common.welcome" del JSON
}

// Cambiar idioma:
i18n.changeLanguage("es");
```

**Archivos de traducción (JSON):**
```json
{
  "common": {
    "welcome": "Welcome",
    "logout": "Logout"
  },
  "auth": {
    "login": "Login",
    "signup": "Sign Up"
  }
}
```

---

## Flujos Clave

### 1. Signup / Login

**Signup:**
1. Usuario rellena formulario (nickname, email, password)
2. Frontend: `authService.signUp(dto)` → `POST /user/signUp`
3. Backend: `UserService.signUp()` valida, hashea password, crea usuario
4. Backend: genera JWT accessToken (15 min) y refreshToken (7 días)
5. Frontend: AuthProvider guarda tokens en localStorage
6. Redirige a `/dashboard`

**Login:**
1. Usuario rellena (email, password)
2. Frontend: `authService.login(params)` → `POST /user/login`
3. Backend: `UserService.login()` valida credenciales (BCrypt)
4. Genera tokens igual que signup
5. Frontend: AuthProvider guarda, redirige a dashboard

### 2. Crear Transacción

1. Usuario navega a "Transacciones" (página `/transactions`)
2. Rellena formulario: cuenta, categoría, monto, fecha, nombre
3. Frontend: `transactionService.addExpense(dto)` → `POST /transaction/expense`
4. Backend: `TransactionService.addExpense()`:
   - Valida montos, fechas, propiedad del usuario
   - Si hay conversión de divisa, obtiene tasa de cambio
   - Decrementa saldo de la cuenta
   - Persiste `Transaction`
5. Frontend: actualiza lista, muestra confirmación

### 3. Sincronizar Banco (Enable Banking)

**Pasos previos:**
1. Usuario tiene cuenta creada en Balio (ej. "Mi cuenta del Santander")
2. Navega a "Cuentas" → "Enlazar banco"
3. Selecciona banco (Santander) del listado (GET `/bank/enablebanking/aspsps`)

**Flujo OAuth:**
1. Frontend: `GET /bank/enablebanking/connect/{accountId}?aspspName=Santander`
2. Backend: `BankService.initEnableBankingConnection()` devuelve URL de reautenticación en Santander
3. Frontend: redirige a esa URL
4. Usuario se autentica en Santander
5. Santander redirige a `GET /bank/enablebanking/callback?code=...&state=...` (público, sin JWT)
6. Backend: `BankService.completeEnableBankingConnection()`:
   - Intercambia `code` por sesión de Enable Banking
   - Obtiene lista de cuentas del usuario en el banco
   - Para cada cuenta: obtiene `externalAccountId`
   - Crea `BankConnection` vinculada a la cuenta local
7. Frontend: redirige a `/accounts?linked=true` con mensaje de éxito

**Sincronización de transacciones:**
1. Usuario hace clic en "Sincronizar" en la cuenta bancaria
2. Frontend: `POST /bank/accounts/{accountId}/sync?lookBackDays=90`
3. Backend:
   - Llama API Enable Banking para obtener transacciones últimos 90 días
   - Para cada transacción:
     - Verifica que no exista (`externalId`)
     - Aplica reglas de mapeo (normaliza nombre, categoría)
     - Crea `Transaction` en BD
   - Actualiza `BankConnection.lastSync`
4. Frontend: muestra número de transacciones importadas

### 4. Crear Widget (Gráfico en Analysis)

**Configuración visualmente:**
1. Usuario navega a "/analysis"
2. Hace clic en "+ Nuevo widget"
3. Rellena formulario:
   - Tipo: CHART, KPI o TABLE
   - Chart type: LINE_CHART, BAR_CHART, PIE_CHART
   - Filtro: categorías, rango de montos, fechas
   - Groupar por: día, mes, categoría
   - Métrica: SUM, AVG, COUNT
4. Frontend: `chartService.previewConfiguration()` → muestra preview
5. Si ok, guarda: `chartService.createWidget()` → `POST /chart`

**Backend al crear:**
- Valida config JSON
- Crea `ChartWidget` con orden de visualización
- Genera preview inicial

**Cuando se visualiza el widget:**
1. Frontend: `chartService.preview(widgetId)` → `POST /chart/{widgetId}/preview`
2. Backend:
   - Recupera config del widget
   - `WidgetFilterEngine` aplica filtros → lista de transacciones
   - `WidgetDataResolverService` agrupa y aplica métrica
   - Devuelve JSON con estructura para graficar
3. Frontend: renderiza gráfico con Chart.js, Recharts o similar

### 5. Filtrar y Buscar Transacciones

**Guardar filtro:**
1. Usuario define criterios (categorías seleccionadas, monto min/max, rango de fechas)
2. Frontend serializa a JSON: `{ "categories": [...], "amountMin": 10, "amountMax": 100, ... }`
3. Guarda: `filterService.createFilter(name, definition)` → `POST /filter`
4. Backend: valida JSON, persiste `Filter`

**Aplicar filtro:**
1. Usuario selecciona filtro guardado
2. Frontend: `filterService.applyFilter(filterId)` → `POST /filter/{filterId}/apply`
3. Backend: `FilterService.applyFilter()`:
   - Carga definición del filtro
   - `TransactionService.findFiltered()` busca en BD (optimizado con WHERE)
   - Para cada transacción, aplica lógica en memoria (multi-categorías, etc.)
   - Devuelve transacciones
4. Frontend: muestra lista filtrada

---

## Gestión de Sesiones

### Timeline de una sesión

**Creación:**
- Login/signup → genera tokens
- `accessToken` expira en 15 min
- `refreshToken` expira en 7 días

**Actividad:**
- AuthContext verifica cada 30s si usuario está inactivo
- Si inactivo > 15 min → warning a los 10 min
- Si pasa el timeout → logout automático

**Expiración del accessToken:**
- Backend rechaza request con 401
- Axios interceptor intenta refresh (usa `refreshToken`)
- Si refresh ok → reintenta request con nuevo token
- Si refresh falla → logout → redirige a login

**Logout:**
- Frontend revoca todos los `refreshToken` del usuario (backend)
- Borra localStorage
- Redirige a `/login`

### Mecanismos de seguridad

1. **Tokens rotadores:** Al refrescar, viejo token se revoca
2. **Rate limiting en login:** Máximo 5 intentos fallidos en 15 min
3. **Password hashing:** BCrypt con salt
4. **CORS restringido:** Solo desde `http://localhost:5173`
5. **CSRF:** Deshabilitado (stateless, JWT)
6. **Headers de seguridad:** HSTS, X-Content-Type-Options, frameOptions
7. **JWT firmado:** RS256 para Enable Banking, HS256 para sesión interna

---

## Internacionalización (i18n)

### Idiomas soportados

- **en**: English
- **es**: Español
- **gal**: Galego

### Estructura de traducciones

Cada JSON tiene claves anidadas:
```json
{
  "common": { "welcome": "..." },
  "auth": { "login": "...", "logout": "..." },
  "transactions": { "addExpense": "...", "expense": "..." }
}
```

### Cambio de idioma

1. Usuario selecciona idioma
2. Frontend: `i18n.changeLanguage("es")`
3. Todos los componentes que usan `useTranslation()` se reactualizan automáticamente

---

## Base de Datos

### Tablas principales

**users**
- id (UUID, PK)
- nickname, email, password_hash
- preferred_currency
- created_at

**accounts**
- id (UUID, PK)
- user_id (FK)
- name, type (CASH, BANK, CREDIT_CARD)
- balance, currency
- is_default
- created_at

**transactions**
- id (UUID, PK)
- user_id, account_id, category_id (FKs)
- type (INCOME, EXPENSE)
- name, amount, currency
- date
- affects_balance
- created_at

**categories**
- id (UUID, PK)
- user_id (FK)
- name, type (INCOME, EXPENSE)
- icon_name, icon_bg_color
- created_at

**budgets**
- id (UUID, PK)
- user_id (FK)
- name, periodicity (MONTHLY, QUARTERLY, YEARLY)
- start_date
- created_at

**budget_categories**
- id (UUID, PK)
- budget_id (FK)
- name, max_amount
- created_at

**goals**
- id (UUID, PK)
- user_id (FK)
- name, target_amount, current_amount
- created_at

**filters**
- id (UUID, PK)
- user_id (FK)
- name, definition (JSON)
- created_at

**chart_widgets** (para Analysis)
- id (UUID, PK)
- user_id (FK)
- name, widget_type (CHART, KPI, TABLE)
- chart_type (LINE_CHART, etc.)
- configuration (JSON)
- display_order (para reordenamiento)
- layout_size (para ajustar tamaño en grid)
- created_at

**bank_connections**
- id (UUID, PK)
- account_id (FK)
- external_account_id (ID en el banco)
- last_sync_at
- created_at

---

## Enable Banking: Integración PSD2/Open Banking Completa

### ¿Qué es Enable Banking?

Enable Banking es un proveedor de API que actúa como intermediario entre Balio y el banco del usuario, permitiendo acceder a cuentas, balances y transacciones mediante el estándar **OAuth 2.0** y **PSD2** (Directiva Europea de Servicios de Pago). El usuario autoriza a Balio a leer datos sin compartir su contraseña.

### Flujo OAuth Completo

**Paso 1: Usuario inicia enlace bancario**
```
Frontend → POST /bank/enablebanking/connect
{
  "accountId": "uuid-of-new-account",
  "aspspName": "ING",        // Nombre del banco (ASPSP)
  "aspspCountry": "ES"       // País
}
```

**Paso 2: Backend genera URL de autorización**
- **BankServiceImpl.initEnableBankingConnection()**
  - Crea un UUID `state = accountId` (vinculación segura entre solicitud y respuesta)
  - Llama a `EnableBankingClient.startAuth(aspspName, aspspCountry, state)`
  - El cliente construye JWT firmado con clave privada RS256 (credenciales de Enable Banking)
  - Envía: `POST https://api.enablebanking.com/oauth/authorize`
    ```json
    {
      "app_id": "tu-uuid-app",
      "aspsp_id": "ing_es",
      "state": "uuid-accountId",
      "redirect_uri": "http://localhost:8080/bank/enablebanking/callback"
    }
    ```
  - **Respuesta:** URL de redirección al banco, ej: `https://ing.es/oauth/authorize?code_challenge=...`
  - Devuelve al frontend: `{ "authUrl": "https://ing.es/oauth/authorize?..." }`

**Paso 3: Frontend redirige al usuario al banco**
```typescript
// BankLinkPage.tsx o similar
window.location.href = authUrl;  // Usuario va al banco, autentica, da permisos
```

**Paso 4: Banco redirige de vuelta a Balio (callback)**
```
https://balio-frontend/bank-link/callback?code=AUTH_CODE&state=accountId
```
- Frontend extrae `code` y `state` del URL
- Opcionalmente notifica al backend: `POST /bank/enablebanking/callback?code=...&state=...`

**Paso 5: Backend intercambia código por tokens/sesión**
- **BankController.handleEnableBankingCallback(code, state)**
  - Valida `state` para prevenir ataques CSRF
  - Llama a `BankServiceImpl.completeEnableBankingConnection(state, code)`
    - Llama a `EnableBankingClient.createSession(code)`
    - Envía JWT+código al endpoint de Enable Banking
    - **Respuesta:** `sessionId`, lista de cuentas conectadas
  - Extrae `externalAccountId` (ID único en el banco)
  - Guarda en `BankConnection(accountId, externalAccountId, sessionId)`
  - Redirige a frontend: `/accounts?linked=true`
  
**Paso 6: Sincronizar transacciones**
```
POST /bank/accounts/{accountId}/sync?lookBackDays=90
```
- **BankController.syncTransactions()**
  - Obtiene `BankConnection` para el accountId
  - Llama a `EnableBankingSyncService.sync(connection)`
    - Usa JWT+sessionId para autenticarse en Enable Banking
    - `GET https://api.enablebanking.com/accounts/{externalAccountId}/transactions?from=2025-01-01`
    - Recibe transacciones del banco (JSON)
    - **Parseado:**
      - `externalId` (transaction_id o entry_reference)
      - `name` (creditor.name / debtor.name / remittance_information)
      - `amount` (transaction_amount.amount)
      - `type` (credit_debit_indicator → INCOME/EXPENSE)
      - `date` (ISO date, fallback a today)
    - **Deduplicación:** no importar si `externalId` ya existe en `transactions` para esta cuenta
    - **Mapeo de categoría:** aplicar `BankTransactionRule` por prioridad
      - Reglas guardadas por usuario (crear automáticamente o manual)
      - Matching: substring nombre (case-insensitive), categoría bancaria, tipo
  - Inserta transacciones nuevas en BD
  - Actualiza `BankConnection.lastSyncAt`
  - Devuelve: `{ "imported": 15, "total": 1 }`

### JWT y Autenticación con Enable Banking

**Firma manual RS256:**
```java
// EnableBankingClient.buildJwt()
Header:  { "typ": "JWT", "alg": "RS256", "kid": "enable-banking-app-id" }
Payload: {
  "iss": "enablebanking.com",
  "aud": "api.enablebanking.com",
  "iat": 1234567890,
  "exp": 1234571490,  // 1 hora
  "app_id": "tu-uuid"
}
Signature: RSA SHA256 con clave privada .pem
```

**Cabulación se cachea 55 minutos** para evitar regenerar en cada petición.

### Manejo de errores y rollback

**Si el usuario cancela o hay error en el banco:**
```
GET /bank/enablebanking/callback?error=access_denied&state=accountId
```

- `BankController.handleEnableBankingCallback() → Exception`
  - Rollback: `AccountDao.deleteById(accountId)` (cancela la cuenta pre-creada)
  - Log de error
  - Redirige a frontend: `/accounts?link_error=true`
  - Frontend muestra toast: "No se pudo enlazar la cuenta"

**Si la sincronización falla:**
- `EnableBankingSyncService` continúa sin interrumpir (transacciones parciales)
- Log con `warn` si hay errores de balance/transacciones

### Configuración (application.yaml)

```yaml
enable-banking:
  application-id: ${ENABLE_BANKING_APP_ID:9b6d5e63-03cd-4732-8b7a-75f298dc43fc}
  private-key-path: ${ENABLE_BANKING_PRIVATE_KEY_PATH:secrets/enablebanking.pem}
  redirect-uri: ${ENABLE_BANKING_REDIRECT_URI:http://localhost:8080/bank/enablebanking/callback}
  api-base-url: https://api.enablebanking.com  # Sandbox para desarrollo
```

**En producción:**
- Guardar clave privada en secretos OS o Vault (nunca en repo)
- Cambiar `api-base-url` si es necesario
- Validar HTTPS en `redirect-uri`

---

## Transiciones Animadas: GSAP en MainPage2

### ¿Qué hace la MainPage2?

Es la página principal pública (landing page) con animaciones fluidas que atraen usuarios. Usa **GSAP** (GreenSock Animation Platform) para:
- Transiciones al scrollear (zoom items)
- Revelar secciones cuando entran en viewport
- Animar íconos y textos

### Componentes clave

**useReveal hook:**
```typescript
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.12 }  // Trigger cuando 12% visible
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}
```
- Devuelve `ref` para el elemento y `visible` (booleano)
- Al renderizar con `className={visible ? "show" : "hide"}` → CSS transition

**Zoom items (3D fly-through):**
```typescript
const ZOOM_ITEMS = [
  { id: "z1", rs: 0.28, re: 0.60, ... },  // rs=range start, re=range end (0-1)
  { id: "z2", rs: 0.15, re: 0.47, ... },
  // ...
];

function computeZoomItem(progress, rs, re) {
  // progress = posición scroll (0 a 1)
  // Calcula z-index y opacity para efecto 3D
  const z = clamped * 800;  // Profundidad
  const opacity = 1 - Math.abs(clamped) * 0.5;
  return { z, opacity, blur };
}
```
- Cada item tiene rango de visibilidad (rs, re)
- A medida que scrollea, los items entran/salen con efecto de profundidad
- Items centrales: rango amplio (siempre visibles)
- Items periféricos: rango reducido (aparecen y desaparecen rápido)

**Clip path animado:**
```css
.feature-card {
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 20px),
    calc(100% - 20px) 100%,
    0 100%
  );
  transition: transform 0.3s ease;
}

.feature-card.show {
  transform: translateY(0);
  opacity: 1;
}
```

**Glow effect dinámico:**
```css
.feature-card {
  box-shadow: 0 0 20px var(--glow-color);  /* Glow personalizado por feature */
}
```

### Flujo de render en scroll

1. Usuario scrollea página
2. `useEffect` calcula `progress` (0-1) de scroll actual vs. altura total
3. Para cada zoom item, llama `computeZoomItem(progress, rs, re)`
4. Actualiza `transform: translateZ(z) ...` → efecto 3D
5. `Intersection Observer` detecta elementos en viewport → `setVisible(true)`
6. CSS aplica `opacity: 1` y animaciones suave

---

## Widgets Dinámicos: Analysis Page (Gráficos Redimensionables)

### Arquitectura de Widgets

**AnalysisPage.tsx:**
- Estado principal: array de `AnalysisWidget[]`
- Cada widget contiene: `id`, `type` (chart/kpi/table), `size` (sm/md/lg), `config` (filtros), `order`
- Cargar widgets guardados del backend: `chartService.getAll()`
- Guardar cambios: `chartService.update()` / `chartService.create()`

**AnalysisWidget tipo:**
```typescript
interface AnalysisWidget {
  id: string;
  type: "line" | "donut" | "stackedBar" | "kpi" | "table";
  size: "sm" | "md" | "lg";
  config: {
    dateRange: "30d" | "90d" | "365d" | "custom";
    transactionType?: "INCOME" | "EXPENSE";
    categoryIds: string[];
    accountIds: string[];
    nameQuery?: string;
    metric: "SUM" | "AVG" | "COUNT" | "NET";
    groupBy?: "category" | "account" | "date";
    // ... más campos
  };
  order: number;
  visible: boolean;
}
```

### Grid y Redimensionado

**AnalysisBoard.tsx** usa `react-grid-layout`:
```typescript
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";

const COLS = 4;   // 4 columnas
const ROW_HEIGHT = 260;  // Altura de cada fila
const SIZE_MAP = {
  sm: { w: 1, h: 1 },   // 1 columna × 1 fila = 260px
  md: { w: 2, h: 1 },   // 2 columnas × 1 fila = 520px + márgenes
  lg: { w: 2, h: 2 },   // 2 columnas × 2 filas = 520×520px
};
```

**Cálculo de layout (empaquetado automático):**
```typescript
function buildLayout(widgets: AnalysisWidget[]): LayoutItem[] {
  const colHeights = new Array(COLS).fill(0);  // Altura acumulada por columna
  
  for (const widget of sorted) {
    const dim = SIZE_MAP[widget.size];
    // Buscar columna donde quepa (mínima altura acumulada)
    let bestY = Infinity;
    for (let x = 0; x <= COLS - dim.w; x++) {
      const maxY = Math.max(...colHeights.slice(x, x + dim.w));
      if (maxY < bestY) bestY = maxY;
    }
    // Insertar en esa posición y actualizar altura
    for (let c = bestX; c < bestX + dim.w; c++) {
      colHeights[c] = bestY + dim.h;
    }
  }
  return layout;  // Posiciones x, y, w, h para cada widget
}
```

**Manejo de redimensionado:**
- Usuario arrastra la esquina del widget
- `react-grid-layout` llama a `onLayoutChange`
- Frontend convierte w/h nuevos a tamaño (`sm`/`md`/`lg`)
- Guarda: `chartService.update({ id, size, order })`
- Backend actualiza `layout_size` en `chart_widgets`

**Reordenamiento por drag:**
- Usuario arrastra widget a nueva posición
- `onLayoutChange` actualiza `order` basado en la nueva posición visual
- Guardado similar al redimensionado

### Flujo de datos: Filtro → Gráfico

**Paso 1: Usuario configura widget**
- **AnalysisConfigurator.tsx:** formulario interactivo
  - Selecciona tipo (line, donut, etc.)
  - Elige categorías, cuentas, fecha, métrica (SUM/AVG/COUNT)
  - Opcionalmente importa filtro guardado

**Paso 2: Frontend valida y serializa config como JSON**
```json
{
  "dateRange": "90d",
  "transactionType": "EXPENSE",
  "categoryIds": ["uuid1", "uuid2"],
  "accountIds": ["uuid3"],
  "metric": "SUM",
  "groupBy": "category"
}
```

**Paso 3: Backend resuelve datos**
- **chartService.getPreview(config)**:
  - Llama a `POST /chart/preview`
  - Backend recibe config, aplica filtros (TransactionService.findFiltered)
  - Agrupa por `groupBy`, calcula métrica (SUM/AVG/COUNT/NET)
  - Devuelve JSON estructura lista para Chart.js:
    ```json
    {
      "labels": ["Comida", "Transporte", "Ocio"],
      "datasets": [
        { "label": "Gasto", "data": [150, 50, 100], "backgroundColor": [...] }
      ]
    }
    ```

**Paso 4: Frontend renderiza gráfico**
- **WidgetRenderer** elige componente según tipo
- Pasa datos a Chart.js / Recharts
- Si hay error, muestra card vacía con mensaje

### Preview y caché

- Backend cachea 5 minutos previas con estructura: `{configHash → chartData}`
- Si el mismo config se pide, devuelve desde caché
- Límite: máx. 100 puntos de datos y 200 filas en table

---

## Importar/Exportar CSV

### Exportar CSV

**Endpoint:**
```
GET /transaction/export/csv?accountId=uuid
```

**Backend (TransactionController):**
```java
// CsvExportService (hipotético, adaptado a tu código)
public ResponseEntity<InputStreamResource> exportTransactions(UUID userId, UUID accountId) {
  List<Transaction> txs = transactionDao.findByUserIdAndAccountId(userId, accountId);
  StringBuilder csv = new StringBuilder();
  csv.append("Fecha,Concepto,Tipo,Cantidad,Categoría\n");
  for (Transaction tx : txs) {
    csv.append(tx.getDate()).append(",")
       .append(tx.getName()).append(",")
       .append(tx.getType()).append(",")
       .append(tx.getAmount()).append(",")
       .append(tx.getCategory().getName()).append("\n");
  }
  return ResponseEntity.ok()
    .header("Content-Disposition", "attachment; filename=transactions.csv")
    .body(new ByteArrayInputStream(csv.toString().getBytes()));
}
```

**Frontend:**
```typescript
const blob = await transactionService.exportCsv(accountId);
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "transacciones.csv";
a.click();
```

### Importar CSV

**Flow:**
1. Usuario selecciona archivo CSV
2. Frontend valida estructura (cabeceras esperadas)
3. Mostrar **ImportCsvModal:** permite mapear columnas y definir reglas
4. Enviar archivo + reglas al backend
5. Backend parsea, aplica reglas, devuelve resultado

**Formato esperado:**
```csv
Fecha,Concepto,Tipo,Cantidad,Categoría
2025-01-15,Supermercado,EXPENSE,45.50,Comida
2025-01-14,Nómina,INCOME,2000.00,Sueldo
```

**Endpoint:**
```
POST /transaction/import/csv
Content-Type: multipart/form-data
file: <CSV>
accountId: uuid
rules: JSON array
```

**Reglas (CsvImportRuleDto):**
```json
[
  {
    "csvColumnName": "Concepto",       // Columna CSV
    "mappedName": "Transporte",         // Normalizar a
    "targetCategoryId": "uuid-cat",
    "priority": 1
  }
]
```

**Backend (TransactionController.importCsv):**
```java
public ResponseEntity<CsvImportResultDto> importCsv(
    @RequestAttribute UUID userId,
    @RequestParam MultipartFile file,
    @RequestParam(required=false) UUID accountId,
    @RequestParam(required=false) String rules) {
  
  // Parsear CSV (Apache Commons CSV o similar)
  // Aplicar reglas de mapeo
  // Deduplicar por (accountId, date, amount)
  // Insertar en BD
  return ResponseEntity.ok(new CsvImportResultDto(imported, skipped, errors));
}
```

**FrontendResponse (CsvImportResultDto):**
```json
{
  "imported": 25,
  "skipped": 3,
  "errors": [
    "Fila 5: Categoría no encontrada",
    "Fila 10: Monto inválido"
  ]
}
```

---

## OAuth Tokens: Flujo Completo y Seguridad

### Tipos de tokens en Balio

**1. Access Token (JWT)**
- **Durabilidad:** 15 minutos (configurable: `JWT_ACCESS_EXPIRATION`)
- **Uso:** Autenticar cada request a endpoints protegidos
- **Header:** `Authorization: Bearer eyJhb...`

**2. Refresh Token (opaco, base64-url)**
- **Durabilidad:** 7 días (configurable: `JWT_REFRESH_EXPIRATION_DAYS`)
- **Uso:** Obtener nuevo access token sin hacer re-login
- **Almacenamiento:** localStorage (seguro si HTTPS)
- **Rotación:** Cada uso genera nuevo refresh token, revocando el anterior

### Flujo de login

```
1. Usuario → POST /user/login { email, password }
2. Backend verifica contraseña, devuelve:
   {
     "accessToken": "eyJhb...",     // 15 min
     "refreshToken": "rnd64base64", // 7 días
     "user": { "id", "email", ... }
   }
3. Frontend almacena en localStorage via session library
4. Cada request: Axios interceptor inyecta accessToken en header
```

### Refresh token flow

```
1. AccessToken expira (15 min)
2. Request a /transaction?... → respuesta 401
3. Interceptor detecta 401:
   - Obtiene refreshToken de localStorage
   - POST /user/refreshToken { refreshToken }
4. Backend:
   - Valida refreshToken (existe en BD, no expirado, no revocado)
   - Genera nuevo accessToken
   - Genera nuevo refreshToken (revoca el anterior)
   - Devuelve ambos
5. Interceptor:
   - Actualiza localStorage con tokens nuevos
   - Reintenta request original con accessToken nuevo
   - Desencola requests en espera
6. Si refresh falla (token expirado/revocado):
   - Limpia sesión
   - Redirige a /login
```

### Rotación de refresh tokens

**Propósito:** si un refreshToken se filtra, al ser usado genera uno nuevo, invalidando el anterior. Esto limita la ventana de exposición.

**Backend (RefreshTokenServiceImpl):**
```java
public String rotateRefreshToken(String oldToken) {
  // 1. Validar que oldToken exista y sea válido
  // 2. Generar nuevo token (random 64 bytes → base64-url)
  // 3. Revocar oldToken (marcar como revoked=true)
  // 4. Guardar nuevo token en BD
  // 5. Retornar nuevo token
}

public void purgeExpiredTokens() {
  // Scheduled task: cada 6 horas
  // DELETE FROM refresh_tokens WHERE expires_at < NOW()
}
```

### Almacenamiento seguro en frontend

**localStorage (inseguro vs. XSS, pero conveniente):**
```typescript
localStorage.setItem("accessToken", token);
localStorage.setItem("refreshToken", token);
```

**Alternativa más segura (HttpOnly cookies):**
```java
// Backend: Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict
// Frontend: no puede leer (JS no accede), automático en requests
```

### Seguridad: CSRF Protection

#### ¿Qué es CSRF?
- **Cross-Site Request Forgery**: ataque donde un sitio malicioso fuerza al navegador a hacer requests a tu app (p. ej. transferencia bancaria) sin que el usuario lo sepa.
- **Ej**: sitio malicioso hace `<img src="http://balio.com/transaction/send?to=attacker">` → el navegador envía cookies de sesión y ejecuta la transferencia.

#### ¿Por qué está **DESHABILITADO** en Balio?

1. **Arquitectura Stateless + JWT**
   - CSRF es protección para sesiones tradicionales basadas en cookies.
   - Balio usa tokens JWT en el header `Authorization: Bearer <token>`.
   - Los tokens **no se envían automáticamente** en requests cross-origin (a diferencia de cookies).
   - Resultado: un sitio malicioso NO puede incluir el token en sus requests.

2. **CORS restrictivo**
   - Solo orígenes permitidos (`http://localhost:5173`, etc.) pueden hacer requests al backend.
   - Sitios maliciosos son bloqueados en preflight (`OPTIONS`).
   - Protección en doble capa: CORS + JWT.

3. **Proof:**
   ```
   Sitio malicioso intenta: fetch('http://balio.com/transaction/add', ...)
   ↓
   Navegador bloqueado por CORS (preflight falla)
   ↑ Incluso si CORS pasase, faltaría el token JWT
   ↑ Backend rechaza sin token válido
   ```

#### Deshabilitación en código (`SecurityConfig.java`)
```java
.csrf(AbstractHttpConfigurer::disable)  // ← CSRF token validation deshabilitado
.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```

#### ¿Y si alguien aún quisiera CSRF activado?
```java
// Para sesiones tradicionales (NO recomendado en Balio):
.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
)
```
- Generaría un token CSRF en cada respuesta.
- Frontend incluiría ese token en requests POST/PUT/DELETE.
- **Problema**: añade complejidad sin beneficio real si usas JWT.

---

#### Enable Banking: Validación de `state` (CSRF equivalente para OAuth)

**Enable Banking callback:**
- OAuth usa `state` parameter como token anti-CSRF.
- Backend genera UUID único cuando inicia auth.
- Valida que `state` recibido en callback = `state` inicial.
- Previene redirects a sitios maliciosos (attacker no conoce el `state`).

**Flujo:**
```
Backend genera state = "abc123xyz"
         ↓
Frontend redirige a banco: /oauth/auth?state=abc123xyz&...
         ↓
Banco redirige a callback: /bank/callback?state=abc123xyz&code=...
         ↓
Backend valida: state == "abc123xyz" ✓ (si no coincide, rechaza)
```

---

#### Comparación: CSRF vs. JWT

| Aspecto | CSRF Token | JWT |
|---------|-----------|-----|
| **Dónde se almacena** | Cookie + header/form | Header `Authorization` |
| **Envío automático** | Cookie se envía siempre | Token se envía manualmente |
| **Cross-origin** | Bloqueado por navegador | CORS restringe orígenes |
| **Complejidad** | Genera + valida en cada request | Una vez en login |
| **Ideal para** | Sesiones tradicionales | APIs stateless (REST/JWT) |

---

#### Recomendaciones de Seguridad

✅ **Balio está correcto:**
- JWT + CORS + sesión stateless = CSRF innecesario.

⚠️ **Si en futuro cambias a sesiones (NO hagas esto):**
- Activa CSRF token.
- Aumenta `maxAge` en CORS si es necesario.

⚠️ **En producción:**
- Asegúrate que `CORS_ALLOWED_ORIGINS` sea específico (no `*`).
- Usa `Secure` flag en cookies (HTTPS).
- Implementa rate limiting para prevenir ataques OAuth (Enable Banking).

---

## Desarrollo vs. Producción

### Desarrollo (application-dev.yaml)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/balio
  jpa:
    show-sql: true

CORS_ALLOWED_ORIGINS: http://localhost:3000,http://localhost:5173

enable-banking:
  api-base-url: https://sandbox.enablebanking.com  # Sandbox
  application-id: ${ENABLE_BANKING_APP_ID:test-uuid}

logging:
  level:
    org.springframework: DEBUG
    Balio.web: DEBUG
```

**Frontend (.env.local):**
```
VITE_API_BASE_URL=http://localhost:8080
VITE_LOG_LEVEL=debug
```

### Producción (environment variables)

```bash
export DB_HOST=prod-db.example.com
export DB_PASSWORD=<strong-pass>
export JWT_SIGN_KEY=<256-bit-key>
export ENABLE_BANKING_APP_ID=<prod-uuid>
export ENABLE_BANKING_PRIVATE_KEY_PATH=/etc/balio-secrets/enablebanking.pem
export CORS_ALLOWED_ORIGINS=https://balio.example.com
```

**Recomendaciones:**
- Usar variables de entorno para todo sensible
- HTTPS obligatorio
- Rate limiting en endpoints públicos
- WAF (firewall de aplicaciones)
- Logs centralizados (ELK, CloudWatch)
- Monitoreo de JWT expiración y refresh token rotation

---

## Resumen: Acciones Clave del Usuario

| Acción | Frontend → Backend | Response | Persistencia |
|--------|----------|----------|--|
| **Login** | POST /user/login | accessToken, refreshToken, user | localStorage |
| **Agregar transacción** | POST /transaction/expense o income | txId, new balance | DB transaction |
| **Crear widget gráfico** | POST /chart | chartId, preview | DB chart_widgets |
| **Redimensionar widget** | PUT /chart/{chartId} | updated chart | DB (size, order) |
| **Enlazar banco** | GET /bank/enablebanking/connect + callback | BankConnection | DB bank_connections, transacciones |
| **Sincronizar banco** | POST /bank/accounts/{id}/sync | { imported, errors } | DB transactions |
| **Exportar CSV** | GET /transaction/export/csv | Blob (CSV file) | N/A (descarga) |
| **Importar CSV** | POST /transaction/import/csv | { imported, skipped } | DB transactions |
| **Refresh token** | POST /user/refreshToken | new accessToken | localStorage (auto) |

---

**Última actualización:** 1 de abril de 2026
- bank_name
- last_sync
- created_at

**bank_transaction_rules**
- id (UUID, PK)
- bank_connection_id (FK)
- name_pattern, bank_category
- mapped_name, mapped_category_id
- priority
- created_at

**refresh_tokens**
- id (UUID, PK)
- user_id (FK)
- token (base64)
- expires_at
- revoked_at
- created_at

**scheduled_transactions**
- id (UUID, PK)
- user_id (FK)
- name, amount, type
- account_id, category_id (FKs)
- freq_years, freq_months, freq_weeks, freq_days
- start_date
- last_executed_at
- active
- created_at

### Migraciones (Flyway)

Ubicación: `backend/src/main/resources/db/migration/`

Ejemplo:
```
V1__initial.sql          → Crea todas las tablas
V2__add_refresh_tokens.sql → Agregaalas de refresh tokens
V3__add_bank_tables.sql  → Adds Enable Banking tables
```

Flyway ejecuta automáticamente en orden al arrancar SpringBoot.

---

## Seguridad

### En Backend

1. **JWT:**
   - Tipo: HS256 (con clave compartida desde env)
   - Payload: userId, iat, exp
   - Almacenado en cliente en localStorage

2. **Passwords:**
   - Hasheadas con BCrypt
   - Validadas en login
   - Cambio revoca todos los tokens

3. **CORS:**
   - Orígenes permitidos: `http://localhost:5173` (configurable)
   - Métodos: GET, POST, PUT, DELETE

4. **Rate Limiting:**
   - 5 intentos fallidos de login → bloquea 15 min
   - Previene fuerza bruta

5. **Headers:**
   - HSTS: força HTTPS en producción
   - X-Content-Type-Options: previene MIME sniffing
   - frameOptions: evita clickjacking

6. **Validación de entrada:**
   - DTOs con `@Validated`, `@NotNull`, `@Email`, etc.
   - Excepciones convertidas a 400/422 con mensajes claros

### En Frontend

1. **XSS Prevention:**
   - React sanitiza automáticamente
   - i18n no permite inyección

2. **CSRF:**
   - No es requerido (stateless, JWT en header Authorization)

3. **LocalStorage:**
   - Tokens guardados, accesibles a JavaScript
   - Recomendación: en producción usar cookies Http-Only (requiere backend)

4. **SSL/TLS en producción:**
   - Solo HTTPS
   - Certificados válidos

---

## Notas Importantes

### Desarrollo

- **Backend:** `./mvnw spring-boot:run` (o IDE)
- **Frontend:** `npm run dev`
- **BD:** PostgreSQL en `localhost:5432`, usuario `balio`, pass `baliopass`
- **Env file:** Ver `docker-compose.yml` para variables

### Producción

- Cambiar todas las claves por defecto
- Habilitar HTTPS
- Usar base de datos administrada (AWS RDS, etc.)
- Configurar CORS restrictivamente
- Desactivar Swagger si es necesario
- Usar variables de entorno para secretos
- Implementar cookies Http-Only para tokens

### Testing

- Backend: Spring Boot Test, JUnit 5, Mockito
- Frontend: Vitest, React Testing Library, Playwright (e2e)

---

## Resumen en Diagrama

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ main.tsx → AuthProvider + RouterProvider    │   │
│  │ └─ ProtectedRoute / PublicRoute              │   │
│  │    └─ Pages (Dashboard, Transactions, etc.)   │   │
│  └──────────────────────────────────────────────┘   │
│  Clients: authService, transactionService, etc.    │
│  Storage: localStorage (tokens, user)               │
│  State: AuthContext (user, isAuthenticated)        │
└─────────────────────────────────────────────────────┘
              │                        │
              │ Axios (interceptors)   │
              │ Bearer JWT             │ 
              ▼                        ▼
┌─────────────────────────────────────────────────────┐
│                 Backend (Spring Boot)                │
│  ┌──────────────────────────────────────────────┐   │
│  │  SecurityConfig → JwtFilter → Controllers    │   │
│  │  ├─ UserController                           │   │
│  │  ├─ TransactionController                   │   │
│  │  ├─ AccountController                       │   │
│  │  └─ ... (ChartController, BankController)   │   │
│  └──────────────────────────────────────────────┘   │
│  Services (business logic)                          │
│  └─ UserService, TransactionService, etc.           │
│  DAOs (data access)                                 │
│  └─ Spring Data JPA repositories                    │
│  Flyway (migrations)                                │
└─────────────────────────────────────────────────────┘
              │                        │
              │ JDBC                   │ OAuth2 (Enable Banking)
              ▼                        ▼
┌───────────────────────┐    ┌────────────────────┐
│  PostgreSQL Database  │    │  Enable Banking API│
│  (users, accounts,    │    │  (PSD2 / OAuth)    │
│   transactions, ...)  │    │                    │
└───────────────────────┘    └────────────────────┘
```

---

**Fin de la documentación.**

Última actualización: Abril 2026
