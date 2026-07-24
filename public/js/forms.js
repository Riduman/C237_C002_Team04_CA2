document.querySelectorAll("[data-password-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.passwordTarget);
    const icon = button.querySelector("i");

    if (!target) return;

    const willShow = target.type === "password";
    target.type = willShow ? "text" : "password";
    icon.className = willShow ? "bi bi-eye-slash" : "bi bi-eye";
  });
});

const imageInput = document.getElementById("profilePicture");
const preview = document.getElementById("profilePreview");

imageInput?.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file || !preview) return;

  preview.src = URL.createObjectURL(file);
});
