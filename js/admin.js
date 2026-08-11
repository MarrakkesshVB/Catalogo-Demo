/**
 * ==========================================================================
 * LÓGICA DEL PANEL DE ADMINISTRACIÓN (js/admin.js)
 * Controla la autenticación de usuario (Login/Logout) mediante Firebase Auth,
 * y las operaciones CRUD (crear y eliminar productos) en Firestore.
 * ==========================================================================
 */

import { 
  db, 
  auth, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "./firebase.js";

// ==========================================================================
// REFERENCIAS A ELEMENTOS DEL DOM (HTML)
// ==========================================================================
const seccionLogin = document.getElementById("seccion-login");
const formLogin = document.getElementById("form-login");
const inputEmail = document.getElementById("login-email");
const inputPassword = document.getElementById("login-password");
const loginErrorMsg = document.getElementById("login-error-msg");

const seccionAdmin = document.getElementById("seccion-admin");
const spanUsuarioEmail = document.getElementById("usuario-email");
const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

const formProducto = document.getElementById("form-producto");
const inputNombre = document.getElementById("prod-nombre");
const inputColor = document.getElementById("prod-color");
const selectCategoria = document.getElementById("prod-categoria");
const selectEstado = document.getElementById("prod-estado");
const inputPrecioUSD = document.getElementById("prod-precio-usd");
const inputPrecioPesos = document.getElementById("prod-precio-pesos");
const inputPrecioTransf = document.getElementById("prod-precio-transf");
const inputFotoURL = document.getElementById("prod-foto-url");
const checkDestacado = document.getElementById("prod-destacado");
const adminErrorMsg = document.getElementById("admin-error-msg");
const adminSuccessMsg = document.getElementById("admin-success-msg");

const tablaProductosBody = document.getElementById("tabla-productos-body");


// ==========================================================================
// CONTROL DE SESIÓN (AUTENTICACIÓN)
// ==========================================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuario Autenticado -> Mostrar Panel
    if (seccionLogin) seccionLogin.style.display = "none";
    if (seccionAdmin) seccionAdmin.style.display = "block";
    if (spanUsuarioEmail) spanUsuarioEmail.textContent = user.email;

    escucharProductosAdmin();
  } else {
    // Usuario No Autenticado -> Mostrar Login
    if (seccionLogin) seccionLogin.style.display = "block";
    if (seccionAdmin) seccionAdmin.style.display = "none";
    if (spanUsuarioEmail) spanUsuarioEmail.textContent = "";
  }
});

// Evento: Login
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMensajes();

    const email = inputEmail.value.trim();
    const password = inputPassword.value.trim();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      formLogin.reset();
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      let mensajeError = "Error al iniciar sesión. Verifica tus credenciales.";
      
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        mensajeError = "Email o contraseña incorrectos.";
      } else if (error.code === "auth/user-not-found") {
        mensajeError = "No existe una cuenta registrada con este email.";
      }

      mostrarErrorLogin(mensajeError);
    }
  });
}

// Evento: Logout
if (btnCerrarSesion) {
  btnCerrarSesion.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Error al cerrar sesión: " + error.message);
    }
  });
}


// ==========================================================================
// CREACIÓN DE PRODUCTOS (addDoc en Firestore)
// ==========================================================================
if (formProducto) {
  formProducto.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMensajes();

    const nuevoProducto = {
      nombre: inputNombre.value.trim(),
      color: inputColor.value.trim(),
      categoria: selectCategoria.value,
      estado: selectEstado.value,
      precioUSD: Number(inputPrecioUSD.value) || 0,
      precioPesos: Number(inputPrecioPesos.value) || 0,
      precioTransferencia: Number(inputPrecioTransf.value) || 0,
      fotoURL: inputFotoURL.value.trim(),
      destacado: checkDestacado.checked
    };

    try {
      await addDoc(collection(db, "productos"), nuevoProducto);
      mostrarExitoAdmin(`¡Producto "${nuevoProducto.nombre}" creado exitosamente!`);
      formProducto.reset();
      selectCategoria.value = "nuevos";
      selectEstado.value = "Nuevo";
    } catch (error) {
      console.error("Error al guardar producto:", error);
      mostrarErrorAdmin("Error al guardar producto: " + error.message);
    }
  });
}


// ==========================================================================
// LISTADO Y ELIMINACIÓN DE PRODUCTOS (deleteDoc en Firestore)
// ==========================================================================
let desuscribirListener = null;

function escucharProductosAdmin() {
  if (!tablaProductosBody) return;

  if (desuscribirListener) desuscribirListener();

  const productosRef = collection(db, "productos");

  desuscribirListener = onSnapshot(productosRef, (snapshot) => {
    if (snapshot.empty) {
      tablaProductosBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: #64748b; padding: 2rem;">
            No hay productos registrados en la base de datos.
          </td>
        </tr>
      `;
      return;
    }

    let filasHTML = "";
    snapshot.forEach((docSnap) => {
      const prod = docSnap.data();
      const id = docSnap.id;

      const urlFoto = (prod.fotoURL && prod.fotoURL.trim() !== "") 
        ? prod.fotoURL 
        : "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5'%3E%3Crect x='5' y='2' width='14' height='20' rx='2'%3E%3C/rect%3E%3C/svg%3E";

      filasHTML += `
        <tr>
          <td>
            <img src="${urlFoto}" alt="${prod.nombre}" onerror="this.onerror=null; this.src='${urlFoto}';" />
          </td>
          <td>
            <strong>${prod.nombre || "Sin nombre"}</strong>
            ${prod.destacado ? ' <span style="color: #d97706; font-size: 0.75rem;">⭐ Destacado</span>' : ''}
          </td>
          <td>${prod.color || "-"}</td>
          <td><span class="badge" style="background-color: #f1f5f9; color: #334155;">${prod.categoria || "-"}</span></td>
          <td>${prod.estado || "-"}</td>
          <td>
            <strong>USD $${(prod.precioUSD || 0).toLocaleString("es-AR")}</strong><br/>
            <small style="color: #64748b;">$${(prod.precioPesos || 0).toLocaleString("es-AR")} ARS</small>
          </td>
          <td>
            <button class="btn-danger btn-eliminar-prod" data-id="${id}" data-nombre="${prod.nombre}">
              Eliminar
            </button>
          </td>
        </tr>
      `;
    });

    tablaProductosBody.innerHTML = filasHTML;

    // Asignar eventos de eliminación
    document.querySelectorAll(".btn-eliminar-prod").forEach((boton) => {
      boton.addEventListener("click", async (e) => {
        const idProd = e.target.dataset.id;
        const nombreProd = e.target.dataset.nombre || "este producto";

        if (confirm(`¿Estás seguro de que deseas eliminar "${nombreProd}"?`)) {
          try {
            await deleteDoc(doc(db, "productos", idProd));
            mostrarExitoAdmin(`Producto "${nombreProd}" eliminado correctamente.`);
          } catch (error) {
            console.error("Error al eliminar producto:", error);
            mostrarErrorAdmin("No se pudo eliminar el producto: " + error.message);
          }
        }
      });
    });
  }, (error) => {
    console.error("Error en la escucha de productos admin:", error);
    mostrarErrorAdmin("Error de permisos o conexión al cargar productos: " + error.message);
  });
}


// Mensajes
function mostrarErrorLogin(msg) {
  if (loginErrorMsg) {
    loginErrorMsg.textContent = msg;
    loginErrorMsg.style.display = "block";
  }
}

function mostrarErrorAdmin(msg) {
  if (adminErrorMsg) {
    adminErrorMsg.textContent = msg;
    adminErrorMsg.style.display = "block";
  }
}

function mostrarExitoAdmin(msg) {
  if (adminSuccessMsg) {
    adminSuccessMsg.textContent = msg;
    adminSuccessMsg.style.display = "block";
    setTimeout(() => {
      adminSuccessMsg.style.display = "none";
    }, 4000);
  }
}

function ocultarMensajes() {
  if (loginErrorMsg) loginErrorMsg.style.display = "none";
  if (adminErrorMsg) adminErrorMsg.style.display = "none";
  if (adminSuccessMsg) adminSuccessMsg.style.display = "none";
}