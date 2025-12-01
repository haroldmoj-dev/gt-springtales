function hamburgerFunc() {
  const hamburger = document.querySelector(".hamburger");
  const rightMenu = document.querySelector(".navbar .right");

  hamburger.addEventListener("click", function (e) {
    rightMenu.classList.toggle("active");
    e.stopPropagation();
  });

  document.addEventListener("click", function (e) {
    if (!hamburger.contains(e.target) && !rightMenu.contains(e.target)) {
      rightMenu.classList.remove("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  hamburgerFunc();
});
