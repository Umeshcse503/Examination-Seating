document.addEventListener('DOMContentLoaded', () => {
    // Scroll Reveal Animation Integration
    const reveals = document.querySelectorAll('.reveal');
    
    const revealOnScroll = () => {
        for (let i = 0; i < reveals.length; i++) {
            const windowHeight = window.innerHeight;
            const elementTop = reveals[i].getBoundingClientRect().top;
            const elementVisible = 150;
            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add('active');
            }
        }
    };

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Initial check

    // Smooth Scroll for Navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Feedback Form Submission
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Show success message
            const submitBtn = feedbackForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            
            submitBtn.innerText = 'Submitting...';
            submitBtn.disabled = true;

            const feedbackData = {
                student_name: feedbackForm.querySelector('input[placeholder="Enter your name"]').value,
                roll_number: feedbackForm.querySelector('input[placeholder="e.g. 25XW5A0503"]').value,
                email: feedbackForm.querySelector('input[placeholder="name@jntu.edu"]').value,
                message: feedbackForm.querySelector('textarea').value
            };

            // Call backend via DB utility
            DB.saveFeedback(feedbackData).then(result => {
                if (result.success) {
                    feedbackForm.innerHTML = `
                        <div class="text-center py-5 fade-in">
                            <div class="card-icon" style="font-size: 4rem;">✅</div>
                            <h3 class="mb-3">Thank you for your feedback.</h3>
                            <p class="text-muted">Your suggestions are valuable to us.</p>
                            <button onclick="location.reload()" class="btn btn-jntu mt-3">Send Another</button>
                        </div>
                    `;
                } else {
                    alert('Error submitting feedback. Please try again.');
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                }
            }).catch(err => {
                console.error(err);
                alert('Connection error. Is the server running?');
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            });
        });
    }

    // Login logic handle in script.js (if needed elsewhere)
    window.logoutFromPortal = () => {
        localStorage.removeItem('userLoggedIn');
        window.location.href = 'homepage.html';
    };
});
