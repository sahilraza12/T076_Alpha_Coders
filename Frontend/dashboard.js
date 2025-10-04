// This is the first line of the file. It's a simple test.
alert("Test JS File is CONNECTED!");

document.addEventListener('DOMContentLoaded', () => {

    const trackBtn = document.getElementById('trackBtn');
    const caseIdInput = document.getElementById('caseIdInput');
    const resultsCard = document.getElementById('resultsCard');
    const loader = document.getElementById('loader');
    const notFoundMessage = document.getElementById('notFound');

    if (trackBtn) {
        trackBtn.addEventListener('click', async () => {
            alert("Track button was clicked!"); // This confirms the button works

            const caseId = caseIdInput.value.trim();
            if (!caseId) {
                return alert('Please enter a Case ID.');
            }

            // --- Real Fetch Logic ---
            loader.style.display = 'block';
            notFoundMessage.style.display = 'none';
            resultsCard.innerHTML = '';

            try {
                const response = await fetch(`http://localhost:3000/api/case/${caseId}`);
                const data = await response.json();
                
                loader.style.display = 'none';

                if (response.ok) {
                    resultsCard.innerHTML = `
                        <h3>Case: ${data.case_id}</h3>
                        <p><strong>Subject:</strong> ${data.subject}</p>
                        <p><strong>Advocate:</strong> ${data.assigned_advocate}</p>
                    `;
                } else {
                    notFoundMessage.style.display = 'block';
                }
            } catch (error) {
                loader.style.display = 'none';
                alert('Could not connect to the backend server.');
            }
        });
    } else {
        alert("Error: Could not find the 'trackBtn' button!");
    }
});