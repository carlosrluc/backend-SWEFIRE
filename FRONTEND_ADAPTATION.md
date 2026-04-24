# Guía de Adaptación Frontend - Autenticación JWT

Esta guía contiene los pasos necesarios para que el equipo de Frontend conecte la aplicación interactiva (UI) con la nueva capa de seguridad de la API utilizando tokens JWT. Todos los endpoints (excepto Login y Healthchecks) ahora están protegidos.

## 1. El Nuevo Endpoint de Inicio de Sesión
El antiguo flujo directo ha quedado obsoleto. Ahora, cuando el usuario ingresa sus credenciales, se debe lanzar un request al siguiente endpoint:

**`POST /api/usuarios/login`**

- **Body (JSON):**
```json
{
  "correo": "rsanchez@swefire.com",
  "contrasena": "password123"
}
```

- **Respuesta Exitosa (200 OK):**
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "idusuario": 1,
    "dni_perfil": "85672134",
    "rol": "Gerente de Proyectos",
    "correo": "rsanchez@swefire.com"
  }
}
```

> [!IMPORTANT]  
> Tras un login exitoso, debes guardar la llave **`token`** dentro del almacenamiento del navegador (`localStorage`, `sessionStorage` o Context API en React) ya que la necesitarás para cada petición futura. Además, las contraseñas actuales de los perfiles pre-existentes dentro de la base de datos se han reseteado para todas a **`password123`**.

## 2. Peticiones a Endpoints Protegidos

Para consumir cualquier otro endpoint como `/api/proyectos`, `/api/clientes`, etc., ahora debes enviar un **Header de Autorización** adherido a la petición HTTP usando tu token guardado.

- **Header Requerido:** `Authorization: Bearer <TOKEN>`

**Ejemplo en JavaScript/Axios:**
```javascript
const token = localStorage.getItem('mi_super_token');

axios.get('https://swefire.onrender.com/api/proyectos', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
}).then(res => {
    console.log("Proyectos cargados:", res.data);
}).catch(err => {
    if(err.response.status === 401) {
        console.error("Token inválido o expirado. ¡Debes loguearte de nuevo!");
        // Redirigir al inicio de sesión
    }
});
```

**Ejemplo en fetch genérico:**
```javascript
fetch('https://swefire.onrender.com/api/clientes', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('mi_super_token')}`
    }
});
```

## 3. Recuperar contraseñas temporalmente

Como parte de los requerimientos, las contraseñas originales nunca son transmitidas desde las rutas de obtención de usuarios globales. Se creó un endpoint temporal exclusivo para consultar la contraseña plana de un usuario (para uso de desarrollo frontend):

**`GET /api/usuarios/temp-pass/:correo`**

- *Ejemplo Petición*: `GET https://swefire.onrender.com/api/usuarios/temp-pass/aflores@swefire.com`
- *Respuesta*:
```json
{
  "correo": "aflores@swefire.com",
  "password": "password123"
}
```

> [!WARNING]  
> Esta práctica rompe las políticas estándares de seguridad (ya que `bcrypt` no es reversible y se ha forzado una medida temporal en una columna extra). Asegúrate de eliminar el uso de este endpoint en tu código Frontend previo al lanzamiento a producción, ya que este endpoint será erradicado poco después para asegurar el sistema.

## 4. Creación de nuevos usuarios
El endpoint de creación (`POST /api/usuarios`) sigue siendo el mismo. Envíen la `"contrasena"` en texto plano durante el body (como siempre), y ahora es tarea del Backend encargarse de encriptarlo con Hash de forma automática antes de guardarlo.

---

## 5. Ejemplo de Prompt para Antigravity (IA Auxiliar)

Si estás usando Antigravity para ayudarte a adaptar rápidamente tu Frontend a este nuevo flujo de autenticación JWT (asumiendo que  tienes componentes estándar como React Router y Context), puedes usar o inspirarte en el siguiente prompt:

> **"Hola Antigravity. Acabamos de migrar nuestro backend a usar JWT para la autenticación en https://swefire.onrender.com/api.** 
> **En el frontend, ya cuento con un formulario de login y vistas protegidas usando React Router. Necesito que:**
> **1. Modifiques mi función de login para que lance un `POST /api/usuarios/login` con `correo` y `contrasena`, y guarde el `token` y el objeto `user` recibidos en el `localStorage` (o en mi AuthContext).**
> **2. Creé o modifiques mi interceptor de Axios (o función fetch base) para que atrape dicho `token` del almacenamiento local y lo adjunte automáticamente como `Authorization: Bearer <token>` en todas las peticiones a la API.**
> **3. Revises mi sistema de rutas para que si el interceptor recibe un error 401 (token expirado o inválido), borre los datos de sesión y devuelva al usuario a la pantalla de login de forma elegante."**
