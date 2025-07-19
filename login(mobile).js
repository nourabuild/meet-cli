// DOM Elements
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("togglePassword");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const signupLink = document.getElementById("signupLink");
const socialBtns = document.querySelectorAll(".social-btn");
const loginBtn = document.querySelector(".login-btn");
const loginContainer = document.querySelector(".login-container");

// Password visibility toggle
function togglePassword() {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    togglePasswordBtn.textContent = "🙈";
    togglePasswordBtn.setAttribute("aria-label", "Hide password");
  } else {
    passwordInput.type = "password";
    togglePasswordBtn.textContent = "👁️";
    togglePasswordBtn.setAttribute("aria-label", "Show password");
  }
}

// Form validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

function showError(input, message) {
  input.classList.add("error");
  let errorMsg = input.parentNode.querySelector(".error-message");
  if (!errorMsg) {
    errorMsg = document.createElement("div");
    errorMsg.className = "error-message";
    input.parentNode.appendChild(errorMsg);
  }
  errorMsg.textContent = message;
  errorMsg.classList.add("show");
}

function hideError(input) {
  input.classList.remove("error");
  const errorMsg = input.parentNode.querySelector(".error-message");
  if (errorMsg) {
    errorMsg.classList.remove("show");
  }
}

// Form submission handling
function handleFormSubmit(e) {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Reset previous errors
  hideError(emailInput);
  hideError(passwordInput);

  let hasErrors = false;

  // Validate email
  if (!email) {
    showError(emailInput, "Email is required");
    hasErrors = true;
  } else if (!validateEmail(email)) {
    showError(emailInput, "Please enter a valid email address");
    hasErrors = true;
  }

  // Validate password
  if (!password) {
    showError(passwordInput, "Password is required");
    hasErrors = true;
  } else if (!validatePassword(password)) {
    showError(passwordInput, "Password must be at least 6 characters");
    hasErrors = true;
  }

  if (hasErrors) {
    return;
  }

  // Show loading state
  showLoading();

  // Simulate API call
  setTimeout(() => {
    hideLoading();
    showSuccessMessage("Login successful! Welcome back.");
    // Here you would typically redirect to dashboard or home page
    // window.location.href = '/dashboard';
  }, 1500);
}

// Loading states
function showLoading() {
  loginBtn.classList.add("loading");
  loginBtn.textContent = "Signing in...";
  loginBtn.disabled = true;
}

function hideLoading() {
  loginBtn.classList.remove("loading");
  loginBtn.textContent = "Sign In";
  loginBtn.disabled = false;
}

// Success message
function showSuccessMessage(message) {
  // Create and show a temporary success message
  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.textContent = message;
  successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #48bb78;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;

  document.body.appendChild(successDiv);

  setTimeout(() => {
    successDiv.style.animation = "slideOutRight 0.3s ease-out";
    setTimeout(() => {
      document.body.removeChild(successDiv);
    }, 300);
  }, 3000);
}

// Social login handling
function handleSocialLogin(provider) {
  console.log(`Initiating ${provider} login...`);
  // Here you would integrate with actual OAuth providers
  alert(`Signing in with ${provider}...`);
}

// Forgot password handling
function handleForgotPassword(e) {
  e.preventDefault();
  const email = emailInput.value.trim();

  if (email && validateEmail(email)) {
    alert(`Password reset link would be sent to: ${email}`);
  } else {
    alert("Please enter your email address first.");
    emailInput.focus();
  }
}

// Signup link handling
function handleSignupLink(e) {
  e.preventDefault();
  console.log("Redirecting to signup page...");
  // Here you would typically redirect to signup page
  // window.location.href = '/signup';
  alert("Redirecting to sign up page...");
}

// Floating animation for the container
function initFloatingAnimation() {
  let floatDirection = 1;
  let currentOffset = 0;

  setInterval(() => {
    if (currentOffset >= 3) floatDirection = -1;
    if (currentOffset <= -3) floatDirection = 1;

    currentOffset += floatDirection * 0.5;
    loginContainer.style.transform = `translateY(${currentOffset}px)`;
  }, 2000);
}

// Input focus animations
function initInputAnimations() {
  const inputs = document.querySelectorAll(".form-input");

  inputs.forEach((input) => {
    input.addEventListener("focus", function () {
      this.parentNode.classList.add("focused");
    });

    input.addEventListener("blur", function () {
      if (!this.value) {
        this.parentNode.classList.remove("focused");
      }
    });
  });
}

// Keyboard accessibility
function initKeyboardNavigation() {
  document.addEventListener("keydown", function (e) {
    // Enter key on social buttons
    if (e.key === "Enter" && e.target.classList.contains("social-btn")) {
      e.target.click();
    }

    // Escape key to close any modals/alerts (if implemented)
    if (e.key === "Escape") {
      // Handle escape key actions
    }
  });
}

// Event listeners
function initEventListeners() {
  // Form submission
  loginForm.addEventListener("submit", handleFormSubmit);

  // Password toggle
  togglePasswordBtn.addEventListener("click", togglePassword);

  // Social login buttons
  socialBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const provider = e.currentTarget.getAttribute("data-provider");
      handleSocialLogin(provider);
    });
  });

  // Forgot password
  forgotPasswordLink.addEventListener("click", handleForgotPassword);

  // Signup link
  signupLink.addEventListener("click", handleSignupLink);

  // Input validation on blur
  emailInput.addEventListener("blur", function () {
    const email = this.value.trim();
    if (email && !validateEmail(email)) {
      showError(this, "Please enter a valid email address");
    } else if (email) {
      hideError(this);
    }
  });

  passwordInput.addEventListener("blur", function () {
    const password = this.value;
    if (password && !validatePassword(password)) {
      showError(this, "Password must be at least 6 characters");
    } else if (password) {
      hideError(this);
    }
  });

  // Clear errors on input
  emailInput.addEventListener("input", () => hideError(emailInput));
  passwordInput.addEventListener("input", () => hideError(passwordInput));
}

// Initialize the application
function init() {
  initEventListeners();
  initFloatingAnimation();
  initInputAnimations();
  initKeyboardNavigation();

  // Set initial focus
  emailInput.focus();

  console.log("Login page initialized successfully");
}

// CSS animations for success message
const style = document.createElement("style");
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Start the application when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
