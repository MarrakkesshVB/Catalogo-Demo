/**
 * ==========================================================================
 * LÓGICA DEL PANEL DE ADMINISTRACIÓN (js/admin.js)
 * Controla la autenticación de usuario (Login/Logout) mediante Firebase Auth,
 * y las operaciones CRUD (crear y eliminar productos) en Firestore.
 * NUEVO: Permite actualizar la cotización del dólar (config/general).
 * ==========================================================================
 */

// Importamos la instancia de la app y las funciones desde firebase.js
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

// Importamos setDoc directamente desde el CDN (para guardar la cotización)
import { setDoc, updateDoc } from "firebase/firestore";

// ==========================================================================
// REFERENCIAS A ELEMENTOS DEL DOM (HTML)
// ==========================================================================
// Vista de Login
const seccionLogin = document.getElementById("seccion-login");
const formLogin = document.getElementById("form-login");
const inputEmail = document.getElementById("login-email");
const inputPassword = document.getElementById("login-password");
const loginErrorMsg = document.getElementById("login-error-msg");

// Vista de Panel Admin
const seccionAdmin = document.getElementById("seccion-admin");
const spanUsuarioEmail = document.getElementById("usuario-email");
const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

// NUEVO: Cotización del dólar
const inputDolar = document.getElementById("config-dolar");
const btnGuardarDolar = document.getElementById("btn-guardar-dolar");

// Formulario de Producto
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

// Lista / Tabla de Productos
const tablaProductosBody = document.getElementById("tabla-productos-body");

// Edición de productos
const btnGuardarProducto = document.getElementById("btn-guardar-producto");
const btnCancelarEdicion = document.getElementById("btn-cancelar-edicion");
const productosCache = {};
let idEditando = null;

// Testimonios
const formTestimonio = document.getElementById("form-testimonio");
const inputTestiNombre = document.getElementById("testi-nombre");
const inputTestiTexto = document.getElementById("testi-texto");
const inputTestiHace = document.getElementById("testi-hace");
const listaTestimonios = document.getElementById("lista-testimonios");


// ==========================================================================
// CONTROL DE SESIÓN (AUTENTICACIÓN)
// ==========================================================================
// Escuchamos el estado de autenticación en tiempo real
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuario Autenticado -> Ocultamos Login y mostramos el Panel Admin
    if (seccionLogin) seccionLogin.style.display = "none";
    if (seccionAdmin) seccionAdmin.style.display = "block";
    if (spanUsuarioEmail) spanUsuarioEmail.textContent = user.email;

    // Iniciar la escucha en vivo de la lista de productos
    escucharProductosAdmin();

    // NUEVO: Iniciar la escucha de la cotización actual
    escucharCotizacionAdmin();
        escucharTestimoniosAdmin();
  } else {
    // Usuario No Autenticado -> Mostramos Formulario de Login y ocultamos Panel
    if (seccionLogin) seccionLogin.style.display = "block";
    if (seccionAdmin) seccionAdmin.style.display = "none";
    if (spanUsuarioEmail) spanUsuarioEmail.textContent = "";
  }
});

// Evento: Iniciar Sesión (Login)
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMensajes();

    const email = inputEmail.value.trim();
    const password = inputPassword.value.trim();

    if (!email || !password) {
      mostrarErrorLogin("Por favor completa el email y la contraseña.");
      return;
    }

    try {
      // Iniciar sesión en Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      formLogin.reset();
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      let mensajeError = "Error al iniciar sesión. Verifica tus credenciales.";
      
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        mensajeError = "Email o contraseña incorrectos.";
      } else if (error.code === "auth/user-not-found") {
        mensajeError = "No existe una cuenta registrada con este email.";
      } else if (error.code === "auth/too-many-requests") {
        mensajeError = "Demasiados intentos fallidos. Intenta más tarde.";
      }

      mostrarErrorLogin(mensajeError);
    }
  });
}

// Evento: Cerrar Sesión (Logout)
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
// NUEVO: GESTIÓN DE LA COTIZACIÓN DEL DÓLAR (config/general)
// ==========================================================================

/**
 * Lee el documento config/general y muestra el valor actual en el input
 */
function escucharCotizacionAdmin() {
  if (!inputDolar) return;

  onSnapshot(doc(db, "config", "general"), (snap) => {
    if (snap.exists() && typeof snap.data().dolar === "number") {
      inputDolar.value = snap.data().dolar;
    }
  }, (error) => {
    console.error("Error al leer la cotización actual:", error);
  });
}

/**
 * Guarda la nueva cotización en Firestore (la web pública se actualiza sola)
 */
if (btnGuardarDolar) {
  btnGuardarDolar.addEventListener("click", async () => {
    ocultarMensajes();

    const valor = Number(inputDolar.value);

    if (!valor || valor <= 0) {
      mostrarErrorAdmin("Ingresa una cotización válida, mayor a 0.");
      return;
    }

    try {
      await setDoc(doc(db, "config", "general"), { dolar: valor }, { merge: true });
      mostrarExitoAdmin("¡Cotización actualizada! El banner de la web pública ya muestra el nuevo valor.");
    } catch (error) {
      console.error("Error al guardar la cotización:", error);
      mostrarErrorAdmin("No se pudo guardar la cotización: " + error.message);
    }
  });
}


// ==========================================================================
// CREACIÓN DE PRODUCTOS (FIRESTORE addDoc)
// ==========================================================================
if (formProducto) {
  formProducto.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMensajes();

    // Recopilamos y formateamos los campos del formulario
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

    // Validación simple
    if (!nuevoProducto.nombre || !nuevoProducto.color) {
      mostrarErrorAdmin("Por favor completa el nombre y el color del producto.");
      return;
    }

    try {
      if (idEditando) {
        // MODO EDICIÓN: actualizar el documento existente
        await updateDoc(doc(db, "productos", idEditando), nuevoProducto);
        mostrarExitoAdmin(`¡Producto "${nuevoProducto.nombre}" actualizado exitosamente!`);
        salirModoEdicion();
      } else {
        // MODO CREACIÓN: guardar documento nuevo
        await addDoc(collection(db, "productos"), nuevoProducto);
        mostrarExitoAdmin(`¡Producto "${nuevoProducto.nombre}" creado exitosamente!`);
      }
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
// LISTADO Y ELIMINACIÓN DE PRODUCTOS (FIRESTORE deleteDoc)
// ==========================================================================
let desuscribirListener = null;

function escucharProductosAdmin() {
  if (!tablaProductosBody) return;

  // Si ya había una escucha activa, la limpiamos primero
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
      productosCache[id] = prod;

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
          <td style="white-space: nowrap;">
            <button class="btn-editar-prod" data-id="${id}">✏️ Editar</button>
            <button class="btn-danger btn-eliminar-prod" data-id="${id}" data-nombre="${prod.nombre}">Eliminar</button>
          </td>
        </tr>
      `;
    });

    tablaProductosBody.innerHTML = filasHTML;

    // Asignar eventos a los botones de edición recién creados
    document.querySelectorAll(".btn-editar-prod").forEach((boton) => {
      boton.addEventListener("click", (e) => {
        entrarModoEdicion(e.target.dataset.id);
      });
    });

    // Asignar eventos a los botones de eliminación recién creados
    document.querySelectorAll(".btn-eliminar-prod").forEach((boton) => {
      boton.addEventListener("click", async (e) => {
        const idProd = e.target.dataset.id;
        const nombreProd = e.target.dataset.nombre || "este producto";

        if (confirm(`¿Estás seguro de que deseas eliminar "${nombreProd}"? Esta acción no se puede deshacer.`)) {
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


// ==========================================================================
// FUNCIONES DE MENSAJES Y ALERTAS
// ==========================================================================
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

// ==========================================================================
// TESTIMONIOS: PUBLICAR Y ELIMINAR (FIRESTORE)
// ==========================================================================
if (formTestimonio) {
  formTestimonio.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMensajes();

    const nombre = inputTestiNombre.value.trim();
    const texto = inputTestiTexto.value.trim();

    if (!nombre || !texto) {
      mostrarErrorAdmin("Completa el nombre y la opinión del testimonio.");
      return;
    }

    try {
      await addDoc(collection(db, "testimonios"), {
        nombre: nombre,
        texto: texto,
        hace: inputTestiHace.value.trim() || "hace unos días",
        createdAt: Date.now()
      });
      mostrarExitoAdmin("¡Testimonio publicado en la web!");
      formTestimonio.reset();
    } catch (error) {
      console.error("Error al guardar testimonio:", error);
      mostrarErrorAdmin("No se pudo guardar el testimonio: " + error.message);
    }
  });
}

function escucharTestimoniosAdmin() {
  if (!listaTestimonios) return;

  onSnapshot(collection(db, "testimonios"), (snap) => {
    if (snap.empty) {
      listaTestimonios.innerHTML = "<p style='color:#64748b; font-size:0.85rem;'>Aún no hay testimonios cargados: la web muestra los 3 de ejemplo.</p>";
      return;
    }

    const lista = [];
    snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
    lista.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    listaTestimonios.innerHTML = lista.map((t) => `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; padding:0.6rem 0; border-bottom:1px solid rgba(255,255,255,0.08);">
        <div>
          <strong style="font-size:0.9rem;">${t.nombre}</strong>
          <p style="color:#94a3b8; font-size:0.8rem; margin:0;">${t.texto}</p>
        </div>
        <button class="btn-danger btn-eliminar-testi" data-id="${t.id}" data-nombre="${t.nombre}">Eliminar</button>
      </div>
    `).join("");

    document.querySelectorAll(".btn-eliminar-testi").forEach((boton) => {
      boton.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        const nombre = e.target.dataset.nombre;
        if (confirm(`¿Eliminar el testimonio de "${nombre}"?`)) {
          try {
            await deleteDoc(doc(db, "testimonios", id));
            mostrarExitoAdmin("Testimonio eliminado.");
          } catch (error) {
            mostrarErrorAdmin("No se pudo eliminar: " + error.message);
          }
        }
      });
    });
  });
}
// ==========================================================================
// RATING DE GOOGLE EDITABLE
// ==========================================================================
const formRating = document.getElementById("form-rating");
const inputRatingNumero = document.getElementById("input-rating-numero");
const inputRatingOpiniones = document.getElementById("input-rating-opiniones");

if (formRating) {
  onSnapshot(doc(db, "config", "rating"), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      inputRatingNumero.value = data.numero || "";
      inputRatingOpiniones.value = data.opiniones || "";
    }
  });

  formRating.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMensajes();
    try {
      await setDoc(doc(db, "config", "rating"), {
        numero: inputRatingNumero.value.trim() || "5.0",
        opiniones: inputRatingOpiniones.value.trim() || "417"
      });
      mostrarExitoAdmin("Rating actualizado en la web.");
    } catch (error) {
      mostrarErrorAdmin("No se pudo guardar el rating: " + error.message);
    }
  });
}

// ==========================================================================
// MODO EDICIÓN DE PRODUCTOS
// ==========================================================================
function entrarModoEdicion(id) {
  const prod = productosCache[id];
  if (!prod) return;

  idEditando = id;

  inputNombre.value = prod.nombre || "";
  inputColor.value = prod.color || "";
  selectCategoria.value = prod.categoria || "nuevos";
  selectEstado.value = prod.estado || "Nuevo";
  inputPrecioUSD.value = prod.precioUSD || "";
  inputPrecioPesos.value = prod.precioPesos || "";
  inputPrecioTransf.value = prod.precioTransferencia || "";
  inputFotoURL.value = prod.fotoURL || "";
  checkDestacado.checked = !!prod.destacado;

  if (btnGuardarProducto) btnGuardarProducto.textContent = "💾 Guardar cambios";
  if (btnCancelarEdicion) btnCancelarEdicion.style.display = "block";

  // Sube hasta el formulario para que se vea la carga de datos
  formProducto.scrollIntoView({ behavior: "smooth", block: "center" });
}

function salirModoEdicion() {
  idEditando = null;
  if (btnGuardarProducto) btnGuardarProducto.textContent = "Guardar Producto";
  if (btnCancelarEdicion) btnCancelarEdicion.style.display = "none";
}

if (btnCancelarEdicion) {
  btnCancelarEdicion.addEventListener("click", () => {
    salirModoEdicion();
    formProducto.reset();
    selectCategoria.value = "nuevos";
    selectEstado.value = "Nuevo";
    ocultarMensajes();
  });
}