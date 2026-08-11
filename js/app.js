/**
 * ==========================================================================
 * LÓGICA PÚBLICA DE LA TIENDA (js/app.js)
 * Maneja la carga en tiempo real de productos desde Firestore, el formateo de
 * precios, filtrado por pestañas de categoría, buscador y enlaces a WhatsApp.
 * ==========================================================================
 */

// Importamos la base de datos e instrucciones necesarias desde nuestro módulo de Firebase
import { db, collection, onSnapshot } from "./firebase.js";

// ==========================================================================
// CONSTANTES EDITABLES (¡Cambia estos valores según tus necesidades!)
// ==========================================================================
// Número de WhatsApp al cual llegarán las consultas (código de país sin el +, ej: 549...)
const WHATSAPP_NUMERO = "5491123456789"; 

// Cotización actual del Dólar en Pesos Argentinos (ARS) para mostrar en el banner informativo
const DOLAR_COTIZACION = 1350; 

// Imagen placeholder por defecto cuando un producto no tiene fotoURL o falla en cargar
const IMAGEN_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='5' y='2' width='14' height='20' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='12' y1='18' x2='12.01' y2='18'%3E%3C/line%3E%3C/svg%3E";


// ==========================================================================
// ESTADO LOCAL DE LA APLICACIÓN
// ==========================================================================
let todosLosProductos = []; // Guardará todos los productos obtenidos de la base de datos
let categoriaSeleccionada = "todos"; // Categoría activa ("todos", "nuevos", "seminuevos", "pedido")
let textoBusqueda = ""; // Texto escrito en el buscador por el usuario


// ==========================================================================
// REFERENCIAS A ELEMENTOS DEL DOM (HTML)
// ==========================================================================
const gridProductos = document.getElementById("grid-productos");
const inputBuscador = document.getElementById("input-buscador");
const contenedorPestañas = document.getElementById("contenedor-pestanas");
const bannerDolarTexto = document.getElementById("banner-dolar-texto");
const floatWhatsapp = document.getElementById("float-whatsapp");


// ==========================================================================
// INICIALIZACIÓN Y EVENTOS PRINCIPALES
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Mostrar la cotización del dólar en el banner superior y configurar el botón flotante
  renderizarBannerDolar();
  configurarBotonFlotanteWhatsapp();

  // 2. Escuchar cambios en tiempo real en la colección 'productos' de Firestore
  escucharProductosEnTiempoReal();

  // 3. Configurar evento de escritura en el buscador
  if (inputBuscador) {
    inputBuscador.addEventListener("input", (e) => {
      textoBusqueda = e.target.value.toLowerCase().trim();
      filtrarYRenderizarProductos();
    });
  }

  // 4. Configurar eventos en las pestañas de categorías
  if (contenedorPestañas) {
    contenedorPestañas.addEventListener("click", (e) => {
      if (e.target.classList.contains("tab-btn")) {
        // Remover clase 'active' de todas las pestañas y asignarla a la cliqueada
        document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
        e.target.classList.add("active");

        // Actualizar la categoría seleccionada
        categoriaSeleccionada = e.target.dataset.categoria || "todos";
        filtrarYRenderizarProductos();
      }
    });
  }
});


// ==========================================================================
// FUNCIONES AUXILIARES Y DE RENDERICIÓN
// ==========================================================================

/**
 * Actualiza el banner superior con el valor de la constante del dólar
 */
function renderizarBannerDolar() {
  if (bannerDolarTexto) {
    const dolarFormateado = DOLAR_COTIZACION.toLocaleString("es-AR");
    bannerDolarTexto.innerHTML = `Cotización de referencia: <strong>1 USD = $${dolarFormateado} ARS</strong> | Pagos en USD y Pesos`;
  }
}

/**
 * Configura el enlace predeterminado del botón flotante de WhatsApp
 */
function configurarBotonFlotanteWhatsapp() {
  if (floatWhatsapp) {
    const mensajeGeneral = encodeURIComponent("¡Hola! Estuve viendo el catálogo web y quisiera hacer una consulta.");
    floatWhatsapp.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensajeGeneral}`;
  }
}

/**
 * Se conecta a Firestore y escucha cualquier alta, baja o modificación de productos en vivo
 */
function escucharProductosEnTiempoReal() {
  try {
    const productosRef = collection(db, "productos");

    // Escuchamos la colección en tiempo real con onSnapshot
    onSnapshot(productosRef, (snapshot) => {
      todosLosProductos = [];
      
      snapshot.forEach((docSnap) => {
        todosLosProductos.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      // Ordenar productos: primero los destacados, luego por nombre
      todosLosProductos.sort((a, b) => {
        if (b.destacado && !a.destacado) return 1;
        if (!b.destacado && a.destacado) return -1;
        return (a.nombre || "").localeCompare(b.nombre || "");
      });

      filtrarYRenderizarProductos();
    }, (error) => {
      console.error("Error al obtener productos de Firestore:", error);
      if (gridProductos) {
        gridProductos.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h3>Ocurrió un error al cargar el catálogo</h3>
            <p>Por favor intenta recargar la página. Detalle: ${error.message}</p>
          </div>
        `;
      }
    });
  } catch (error) {
    console.error("Error al inicializar la escucha de Firestore:", error);
  }
}

/**
 * Filtra la lista global de productos según la categoría seleccionada y la búsqueda
 */
function filtrarYRenderizarProductos() {
  if (!gridProductos) return;

  const productosFiltrados = todosLosProductos.filter((prod) => {
    // Filtro 1: Categoría
    const coincideCategoria = 
      categoriaSeleccionada === "todos" || 
      (prod.categoria && prod.categoria.toLowerCase() === categoriaSeleccionada.toLowerCase());

    // Filtro 2: Búsqueda por texto (nombre o color)
    const nombreProd = (prod.nombre || "").toLowerCase();
    const colorProd = (prod.color || "").toLowerCase();
    const coincideBusqueda = 
      textoBusqueda === "" || 
      nombreProd.includes(textoBusqueda) || 
      colorProd.includes(textoBusqueda);

    return coincideCategoria && coincideBusqueda;
  });

  renderizarGrid(productosFiltrados);
}

/**
 * Genera el HTML de las tarjetas de productos e insufla el grid
 * @param {Array} listaProductos Lista de objetos de productos
 */
function renderizarGrid(listaProductos) {
  if (listaProductos.length === 0) {
    gridProductos.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📱</div>
        <h3>No se encontraron celulares</h3>
        <p>Prueba ajustando el buscador o seleccionando otra categoría.</p>
      </div>
    `;
    return;
  }

  const tarjetasHTML = listaProductos.map((prod) => {
    // Formateo de precios usando toLocaleString("es-AR")
    const precioUSDFormateado = (prod.precioUSD || 0).toLocaleString("es-AR");
    const precioPesosFormateado = (prod.precioPesos || 0).toLocaleString("es-AR");
    const precioTransfFormateado = (prod.precioTransferencia || 0).toLocaleString("es-AR");

    // Imagen y fallback en caso de URL vacía o rota
    const urlFoto = (prod.fotoURL && prod.fotoURL.trim() !== "") ? prod.fotoURL : IMAGEN_PLACEHOLDER;

    // Badges (Etiquetas de estado y destacado)
    const esNuevo = (prod.estado || "").toLowerCase() === "nuevo";
    const badgeEstadoClase = esNuevo ? "badge-nuevo" : "badge-usado";
    const badgeEstadoTexto = prod.estado || (esNuevo ? "Nuevo" : "Usado");

    const badgeDestacadoHTML = prod.destacado 
      ? `<span class="badge badge-destacado">🔥 Más vendido</span>` 
      : `<span></span>`;

    // Mensaje pre-cargado para WhatsApp
    const mensajeWA = encodeURIComponent(`Hola! Me interesa el ${prod.nombre}`);
    const enlaceWA = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensajeWA}`;

    return `
      <article class="product-card" id="prod-${prod.id}">
        <!-- Contenedor de Imagen y Badges -->
        <div class="card-image-container">
          <img 
            src="${urlFoto}" 
            alt="${prod.nombre}" 
            class="product-image"
            onerror="this.onerror=null; this.src='${IMAGEN_PLACEHOLDER}';"
            loading="lazy"
          />
          <div class="badge-container">
            <span class="badge ${badgeEstadoClase}">${badgeEstadoTexto}</span>
            ${badgeDestacadoHTML}
          </div>
        </div>

        <!-- Cuerpo con Detalles del Celular -->
        <div class="card-body">
          <h3 class="product-title">${prod.nombre}</h3>
          
          <div class="product-details">
            <span>Color: <strong>${prod.color || "No especificado"}</strong></span>
          </div>

          <!-- Cuadro de Precios -->
          <div class="prices-section">
            <div class="price-row">
              <span class="price-label">Efectivo USD:</span>
              <span class="price-val-usd">USD $${precioUSDFormateado}</span>
            </div>
            <div class="price-row">
              <span class="price-label">Efectivo Pesos:</span>
              <span class="price-val-pesos">$${precioPesosFormateado}</span>
            </div>
            <div class="price-row">
              <span class="price-label">Transferencia:</span>
              <span class="price-val-transfer">$${precioTransfFormateado}</span>
            </div>
          </div>

          <!-- Botón de Compra por WhatsApp -->
          <a 
            href="${enlaceWA}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="btn-whatsapp"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            Solicitar cita para comprar
          </a>
        </div>
      </article>
    `;
  }).join("");

  gridProductos.innerHTML = tarjetasHTML;
}