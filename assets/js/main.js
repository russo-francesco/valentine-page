const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const result = document.getElementById("result");

let scale = 1;

// NO scappa
document.addEventListener("mousemove", (e) => {
  const rect = noBtn.getBoundingClientRect();

  const distance = Math.hypot(
    e.clientX - (rect.left + rect.width / 2),
    e.clientY - (rect.top + rect.height / 2)
  );

  if (distance < 100) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;

    noBtn.style.position = "absolute";
    noBtn.style.left = x + "px";
    noBtn.style.top = y + "px";

    // YES cresce
    scale += 0.1;
    yesBtn.style.transform = `scale(${scale})`;
  }
});

// CLICK YES
yesBtn.addEventListener("click", () => {
  yesBtn.style.display = "none";
  noBtn.style.display = "none";
  result.hidden = false;
});
