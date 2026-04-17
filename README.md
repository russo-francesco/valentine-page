# ❤️ Valentine Interactive Page

One-page interactive Valentine website built with **HTML, CSS and Vanilla JavaScript**, designed to be deployed on **GitHub Pages**.

👉 Live demo:  
https://ciccio264.github.io/valentine-page/

---

## ✨ Features

- One-page responsive layout
- Customizable message (name injection)
- Interactive buttons:
  - **YES** → grows progressively
  - **NO** → avoids pointer (repulsion + teleport logic)
- Contextual hint shown only after interaction
- Final state with GIF animation
- No external libraries

---

## 🧠 How it works

- The **NO button** uses:
  - pointer proximity detection
  - repulsion physics
  - controlled teleport fallback

- The **YES button**:
  - increases size on each failed NO interaction
  - triggers final state on click

- The title is dynamically generated using a template: { name }, will you be my Valentine?

---

## ⚙️ Customization (IMPORTANT)

Before sending the page, modify these parameters:

---

### 1. Name (main text)

📄 File: assets/js/main.js

Edit this section:

```js
texts: {
  name: "AAAA", // <-- CHANGE HERE
  titleTemplate: "{name}, will you be my Valentine?",
  subtitle: "Choose wisely.",
  hint: "“No” seems a bit shy 😈"
}

- Behavior:
  - If name is filled → AAAA, will you be my Valentine?
  - If empty → Will you be my Valentine?
