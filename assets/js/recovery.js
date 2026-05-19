/**
 * Account Recovery Controller
 * Standardized for the Charcoal/Gold Admin Gateway
 */

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';

    // State
    let identifierVal = "";
    let isPhone = false;
    let reqID = "";
    let timerVal = 0;
    let timerInterval = null;

    // MSG91 Constants (Synced with Client React Code)
    const widgetId = "346a776c5749333834363239";
    const tokenAuth = "432663TzWGndK2N7sR6710de92P1";

    // DOM Elements
    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");
    const step3 = document.getElementById("step3");

    const step1Form = document.getElementById("step1Form");
    const step2Form = document.getElementById("step2Form");
    const step3Form = document.getElementById("step3Form");

    const identifierInput = document.getElementById("identifier");
    const otpCodeInput = document.getElementById("otpCode");
    const newPasswordInput = document.getElementById("newPassword");
    const confirmNewPasswordInput = document.getElementById("confirmNewPassword");

    const resendOtpBtn = document.getElementById("resendOtpBtn");
    const otpTimer = document.getElementById("otpTimer");

    // Helper: Show Steps
    function showStep(stepNum) {
        step1.classList.remove("active");
        step2.classList.remove("active");
        step3.classList.remove("active");

        if (stepNum === 1) step1.classList.add("active");
        if (stepNum === 2) step2.classList.add("active");
        if (stepNum === 3) step3.classList.add("active");
    }

    // Helper: Format Timer Display
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    // Helper: Start Timer
    function startTimer(duration) {
        clearInterval(timerInterval);
        timerVal = duration;
        otpTimer.innerText = `Expires in: ${formatTime(timerVal)}`;
        resendOtpBtn.style.pointerEvents = "none";
        resendOtpBtn.style.opacity = "0.5";

        timerInterval = setInterval(() => {
            timerVal--;
            if (timerVal <= 0) {
                clearInterval(timerInterval);
                otpTimer.innerText = "OTP Expired";
                resendOtpBtn.style.pointerEvents = "auto";
                resendOtpBtn.style.opacity = "1";
            } else {
                otpTimer.innerText = `Expires in: ${formatTime(timerVal)}`;
            }
        }, 1000);
    }

    // STEP 1: Request OTP
    async function sendOtpCode() {
        const value = identifierInput.value.trim();
        if (!value) return;

        identifierVal = value;
        isPhone = /^\d+$/.test(value);

        try {
            Swal.fire({
                title: "Dispatching OTP...",
                text: "Please wait.",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            if (isPhone) {
                // Validate 10-digit number
                if (identifierVal.length !== 10) {
                    throw new Error("Mobile number must be exactly 10 digits");
                }

                // Send via MSG91 SMS Gateway
                const response = await fetch("https://api.msg91.com/api/v5/widget/sendOtp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        widgetId,
                        tokenAuth,
                        identifier: `91${identifierVal}`
                    })
                });

                const result = await response.json();
                if (result.success || result.message) {
                    reqID = result.message;
                    Swal.fire({
                        icon: "success",
                        title: "OTP Dispatched",
                        text: "An SMS OTP code has been sent successfully to your phone!",
                        background: "#1a1a1a",
                        color: "#fff",
                        confirmButtonColor: "#e0c214"
                    });
                    showStep(2);
                    startTimer(300);
                } else {
                    throw new Error(result.message || "Failed to dispatch SMS OTP");
                }
            } else {
                // Validate Email structure
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifierVal)) {
                    throw new Error("Please enter a valid email address");
                }

                // Send via Node/Express Mailer API
                const response = await fetch(`${API_BASE}/api/send-otp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: identifierVal.toLowerCase() })
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    Swal.fire({
                        icon: "success",
                        title: "OTP Dispatched",
                        text: "A verification OTP has been sent successfully to your email address!",
                        background: "#1a1a1a",
                        color: "#fff",
                        confirmButtonColor: "#e0c214"
                    });
                    showStep(2);
                    startTimer(300);
                } else {
                    throw new Error(result.message || "Failed to send email OTP");
                }
            }
        } catch (error) {
            console.error("Send OTP Error:", error);
            Swal.fire({
                icon: "error",
                title: "Dispatch Failed",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
        }
    }

    step1Form.addEventListener("submit", (e) => {
        e.preventDefault();
        sendOtpCode();
    });

    resendOtpBtn.addEventListener("click", () => {
        sendOtpCode();
    });

    // STEP 2: Verify OTP
    step2Form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const otp = otpCodeInput.value.trim();
        if (otp.length !== 6) return;

        try {
            Swal.fire({
                title: "Verifying Code...",
                text: "Please wait.",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            if (isPhone) {
                // Verify via MSG91 Gateway
                const response = await fetch("https://api.msg91.com/api/v5/widget/verifyOtp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        otp,
                        reqId: reqID,
                        widgetId,
                        tokenAuth
                    })
                });

                const result = await response.json();
                if (result.type === "success") {
                    Swal.fire({
                        icon: "success",
                        title: "OTP Verified",
                        text: "Identity verified! Please set your new password.",
                        background: "#1a1a1a",
                        color: "#fff",
                        confirmButtonColor: "#e0c214"
                    });
                    showStep(3);
                } else {
                    throw new Error("Invalid verification code. Please try again.");
                }
            } else {
                // Verify via Backend Mailer API
                const response = await fetch(`${API_BASE}/api/verify-otp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: identifierVal.toLowerCase(),
                        otp
                    })
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    Swal.fire({
                        icon: "success",
                        title: "OTP Verified",
                        text: "Identity verified! Please set your new password.",
                        background: "#1a1a1a",
                        color: "#fff",
                        confirmButtonColor: "#e0c214"
                    });
                    showStep(3);
                } else {
                    throw new Error(result.message || "Invalid OTP code");
                }
            }
        } catch (error) {
            console.error("Verify OTP Error:", error);
            Swal.fire({
                icon: "error",
                title: "Verification Failed",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
        }
    });

    // STEP 3: Reset Password
    step3Form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const newPass = newPasswordInput.value;
        const confirmPass = confirmNewPasswordInput.value;

        if (newPass !== confirmPass) {
            Swal.fire({
                icon: "warning",
                title: "Passwords Mismatch",
                text: "The passwords you entered do not match.",
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff9f43"
            });
            return;
        }

        try {
            Swal.fire({
                title: "Resetting Password...",
                text: "Updating secure credentials.",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const requestBody = isPhone ? {
                phone: identifierVal,
                newPassword: newPass
            } : {
                email: identifierVal.toLowerCase(),
                newPassword: newPass
            };

            const response = await fetch(`${API_BASE}/api/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to reset security password");
            }

            Swal.fire({
                icon: "success",
                title: "Password Reset Successful",
                text: "Your password has been changed successfully! Redirecting to login gateway.",
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#e0c214"
            });

            setTimeout(() => {
                window.location.href = "./index.html";
            }, 2000);

        } catch (error) {
            console.error("Reset Password Error:", error);
            Swal.fire({
                icon: "error",
                title: "Reset Failed",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
        }
    });
});
