# 🧩 GUÍA PASO A PASO – Publicación de Sitio Web Conectadata

Este documento resume todo el proceso realizado para crear y publicar el sitio web profesional **Conectadata** usando GitHub Pages.

---

## 🧭 OBJETIVO

Publicar un sitio web profesional desde un repositorio GitHub, incluyendo README, enlaces e imagen de perfil.

---

## 🚀 PASOS REALIZADOS

### 1. Clonar el repositorio desde GitHub

```bash
git clone https://github.com/tuusuario/conectadata.git
cd conectadata
```

---

### 2. Abrir el proyecto en Visual Studio Code

```bash
code .
```

> Este comando abre toda la carpeta actual (`conectadata`) en Visual Studio Code.

---

### 3. Crear y editar el archivo README.md

1. En VSC, crea el archivo `README.md`.
2. Agrega el siguiente contenido personalizado:

```markdown
# Conectadata

Bienvenida/o a Conectadata, un espacio que une la inteligencia de datos con la transformación humana.  
📍 San Antonio, Chile  
👩‍💼 Fundadora: Isabel Arentsen  

## 🌐 Enlaces

- [LinkedIn](https://linkedin.com/in/isabelarentsen)
- [GitHub](https://github.com/tuusuario)
- [Sitio Web Personal](https://tuusuario.github.io/conectadata)

## 🧠 Sobre Conectadata

Consultora especializada en soluciones de IA, automatización y desarrollo estratégico para organizaciones que buscan innovar sin perder el enfoque humano.
```

---

### 4. Subir los cambios a GitHub

```bash
git add README.md
git commit -m "Agregar README profesional para conectadata"
git push
```

---

### 5. (Opcional) Agregar imagen de perfil

1. Copia `perfil.jpg` a la carpeta `conectadata`.
2. Agrega esta línea al final del `README.md`:

```markdown
![Perfil](./perfil.jpg)
```

3. Sube con:

```bash
git add perfil.jpg
git commit -m "Agregar imagen de perfil"
git push
```

---

### 6. Activar GitHub Pages

1. En GitHub, ve a **Settings > Pages**.
2. Selecciona:
   - Rama: `main`
   - Carpeta: `/ (root)`
3. Espera unos segundos y tu sitio estará disponible en:  
   `https://tuusuario.github.io/conectadata`

---

## ✅ Resultado Final

Tu sitio web personal ya está activo y visible al público con diseño profesional y enlaces funcionales.
