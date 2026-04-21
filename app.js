

const SUPABASE_URL = //add your supabase url 
const SUPABASE_ANON_KEY = //add your supabase anon key;
const SUPABASE_SERVICE_KEY = //add you supabase service key;

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- (FIX 4) ---
// Define map variables in a broader scope so they can be accessed
// by the initialization and refresh functions.
let issueMapInstance;
let issueMapLayerGroup;


// We wrap all code in a DOMContentLoaded listener
// This ensures the HTML page is 100% loaded before we try to find elements
document.addEventListener('DOMContentLoaded', () => {

     // --- (NEW) Code for Login/Register Panel Slider ---
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');

    if (signUpButton && signInButton && container) {
        signUpButton.addEventListener('click', () => {
            container.classList.add("right-panel-active");
        });

        signInButton.addEventListener('click', () => {
            container.classList.remove("right-panel-active");
        });
    }
    // --- (END OF NEW LOGIN CODE) ---


    // --- AUTHENTICATION ---
    const signupForm = document.querySelector('#signup-form');
    const loginForm = document.querySelector('#login-form');

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.querySelector('#signup-name').value;
            const email = document.querySelector('#signup-email').value;
            const password = document.querySelector('#signup-password').value;
            const { data, error } = await client.auth.signUp({ email, password });
            if (error) {
                alert('Error signing up: ' + error.message);
                return;
            }
            const { error: profileError } = await client.from('profiles').insert({ id: data.user.id, full_name: name });
            if (profileError) {
                alert('Error creating profile: ' + profileError.message);
            } else {
                alert('Account created! Please log in.');
                // (NEW) Automatically flip back to the login panel
                if (container) {
                    container.classList.remove("right-panel-active");
                }
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.querySelector('#login-email').value;
            const password = document.querySelector('#login-password').value;
            const { error } = await client.auth.signInWithPassword({ email, password });
            if (error) {
                alert('Error logging in: ' + error.message);
            } else {
                // (NEW) Check if admin or user
                if (email.toLowerCase() === 'admin@civic.com') { // <-- This is your admin email
                    window.location.href = 'admin.html'; // Go to admin page
                } else {
                    window.location.href = 'dashboard.html';
                }
            }
        });
    }
    // --- USER DASHBOARD ---
    const userGreeting = document.querySelector('#user-greeting');
    const issuesList = document.querySelector('#issues-list');
    const logoutButton = document.querySelector('#logout-button');
    const domainCards = document.querySelectorAll('.domain-card');

    const reportModal = document.querySelector('#report-modal');
    const reportModalCloseBtn = reportModal ? reportModal.querySelector('.close-button') : null;
    const issueForm = document.querySelector('#issue-form');

    const detailsModal = document.querySelector('#issue-details-modal');
    const detailsModalCloseBtn = detailsModal ? detailsModal.querySelector('.close-button') : null;


    async function checkUser() {
        const { data: { session } } = await client.auth.getSession();
        
        if (!session) {
            window.location.href = 'login.html';
        } else {
            console.log('User session confirmed. Fetching data...');
            fetchUserData(session.user);
            setupRealtimeListener();
            initializeAndLoadMap(); // --- (FIX 4) --- Load the map on dashboard load
        }
    }

    async function fetchUserData(user) { 
        if (!user) {
            console.error("fetchUserData was called without a user object.");
            return; 
        }

        try {
            const { data: profile } = await client.from('profiles').select('full_name').eq('id', user.id).single();
            if (userGreeting && profile && profile.full_name) {
                userGreeting.innerText = `Welcome, ${profile.full_name}!`;
            }
        } catch (profileError) {
            console.warn('Could not fetch user profile:', profileError.message);
            if (userGreeting) {
                userGreeting.innerText = `Welcome!`;
            }
        }

        const { data: issues, error } = await client.from('issues').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (error) { console.error('Error fetching issues:', error); return; }
        
        const totalIssuesEl = document.getElementById('total-issues');
        const progressIssuesEl = document.getElementById('progress-issues');
        const resolvedIssuesEl = document.getElementById('resolved-issues');

        if (totalIssuesEl) totalIssuesEl.innerText = issues.length;
        if (progressIssuesEl) progressIssuesEl.innerText = issues.filter(i => i.status === 'In Progress').length;
        if (resolvedIssuesEl) resolvedIssuesEl.innerText = issues.filter(i => i.status === 'Resolved').length;
        
        if (!issuesList) return; 
        
        issuesList.innerHTML = '';
        if (issues.length === 0) { issuesList.innerHTML = '<p>You have not reported any issues yet.</p>'; return; }
        
        issues.forEach(issue => {
            const statusClass = issue.status.replace(' ', ''); 
            const borderColor = issue.status === 'Resolved' ? 'var(--success-color)' : issue.status === 'In Progress' ? 'var(--warning-color)' : 'var(--primary-color)';
            
            // --- (FIX 1) ---
            // Changed `class.issue-details"` to `class="issue-details"`
            // This correctly formats the issue card so you can see the content.
            issuesList.innerHTML += `
                <div class="issue-card" data-id="${issue.id}" style="border-left: 6px solid ${borderColor};">
                    <div class="issue-details">
                        <h3>${issue.title}</h3>
                        <p><strong>Category:</strong> ${issue.category}</p>
                        <p><strong>Location:</strong> ${issue.location}</p>
                    </div>
                    <span class="status-badge status-${statusClass}">${issue.status}</span>
                </div>`;
            // --- (END OF FIX 1) ---
        });
    }

    async function showIssueDetails(issueId) {
        const numericId = parseInt(issueId, 10);
        if (isNaN(numericId)) {
            console.error("Invalid issue ID:", issueId);
            return; 
        }

        const { data: issue, error } = await client
            .from('issues')
            .select('*')
            .eq('id', numericId)
            .single();
            
        if (error) {
            alert('Error fetching issue details.');
            console.error(error);
            return;
        }

        document.getElementById('detail-title').innerText = issue.title;
        document.getElementById('detail-category').innerText = issue.category;
        document.getElementById('detail-location').innerText = issue.location;
        document.getElementById('detail-description').innerText = issue.description;

        const statusBadge = document.getElementById('detail-status');
        statusBadge.innerText = issue.status;
        statusBadge.className = `status-badge status-${issue.status.replace(' ', '')}`;

        const reportImage = document.getElementById('detail-report-image');
        if (issue.image_url) {
            reportImage.src = issue.image_url;
            reportImage.style.display = 'block';
        } else {
            reportImage.style.display = 'none';
        }

        const resolutionSection = document.getElementById('detail-resolution-section');
        if (issue.status === 'Resolved' && issue.resolved_image_url) {
            document.getElementById('detail-resolved-name').innerText = issue.resolved_by_name || 'N/A';
            document.getElementById('detail-resolved-contact').innerText = issue.resolved_by_contact || 'N/A';
            document.getElementById('detail-resolution-image').src = issue.resolved_image_url;
            resolutionSection.style.display = 'block';
        } else {
            resolutionSection.style.display = 'none';
        }
        
        detailsModal.style.display = 'block';
    }

    function setupRealtimeListener() {
        client
            .channel('issue_updates')
            .on(
                'broadcast',
                { event: 'status_update' },
                (payload) => {
                    fetchUserData(); 
                }
            )
            .subscribe((status) => {
                 if (status === 'SUBSCRIBED') {
                    console.log('Realtime listener subscribed.');
                 }
            });
    }

    // --- MODAL & FORM LOGIC ---
    if (reportModal) {
      domainCards.forEach(card => card.addEventListener('click', () => {
        const category = card.dataset.category;
        document.querySelector('#modal-title').innerText = `Report New ${category} Issue`;
        document.querySelector('#issue-category').value = category;
        reportModal.style.display = 'block';
      }));

      reportModalCloseBtn.addEventListener('click', () => { 
        reportModal.style.display = 'none'; 
        issueForm.reset(); 
      });

      // --- (FIX 2) ---
      // Added an event listener to the main issues list.
      // This checks if you clicked on an element with the class '.issue-card'
      // and, if so, grabs its 'data-id' and calls showIssueDetails.
      if (issuesList) {
        issuesList.addEventListener('click', (e) => {
          const card = e.target.closest('.issue-card');
          if (card) {
            const issueId = card.dataset.id;
            showIssueDetails(issueId);
          }
        });
      }
      // --- (END OF FIX 2) ---

      // --- (FIX 3) ---
      // This logic is completely refactored to be more robust.
      issueForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = issueForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerText = 'Submitting...';

        const { data: { user } } = await client.auth.getUser();
        if (!user) {
          alert('Error: You are no longer logged in.');
          submitButton.disabled = false;
          submitButton.innerText = 'Submit Issue';
          return;
        }

        const title = document.querySelector('#issue-title').value;
        const description = document.querySelector('#issue-description').value;
        const location = document.querySelector('#issue-location').value;
        const category = document.querySelector('#issue-category').value;
        const imageFile = document.querySelector('#issue-image').files[0];
        let imageUrl = null;

        // 1. Upload the image (if provided)
        if (imageFile) {
          const fileName = `${user.id}/${Date.now()}-${imageFile.name}`;
          const { error: uploadError } = await client.storage.from('issue_images').upload(fileName, imageFile);
          if (uploadError) {
            alert('Error uploading image: ' + uploadError.message);
            submitButton.disabled = false;
            submitButton.innerText = 'Submit Issue';
            return;
          }
          const { data } = client.storage.from('issue_images').getPublicUrl(fileName);
          imageUrl = data.publicUrl;
        }

        // 2. Define a helper function to handle the actual database insert.
        // This allows us to call it from multiple places (geo success, geo error, geo unsupported)
        const submitIssueToSupabase = async (coords) => {
            const issueData = {
                title,
                description,
                location,
                category,
                image_url: imageUrl,
                user_id: user.id,
                status: 'Submitted',
            };

            // Only add location data IF coords were successfully captured
            if (coords) {
                issueData.latitude = coords.latitude;
                issueData.longitude = coords.longitude;
            }

            const { error: insertError } = await client.from('issues').insert(issueData);

            if (insertError) {
                alert('Error submitting issue: ' + insertError.message);
            } else {
                alert('✅ Issue submitted successfully!');
                reportModal.style.display = 'none';
                issueForm.reset();
                fetchUserData(user); // refresh list
                initializeAndLoadMap(); // --- (FIX 4) --- Refresh the map!
            }

            submitButton.disabled = false;
            submitButton.innerText = 'Submit Issue';
        };

        // 3. Try to get geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              // SUCCESS: User allowed location. Submit with coordinates.
              submitIssueToSupabase(pos.coords);
            },
            (error) => {
              // ERROR: User denied location or API failed.
              // Submit anyway, but with null coordinates.
              console.error('Geolocation error:', error);
              alert('⚠️ Location access denied or failed. Submitting issue without map tag.');
              submitIssueToSupabase(null);
            }
          );
        } else {
          // NOT SUPPORTED: Browser doesn't have geolocation.
          // Submit anyway, but with null coordinates.
          alert('Geolocation not supported by your browser. Submitting issue without map tag.');
          submitIssueToSupabase(null);
        }
      });
      // --- (END OF FIX 3) ---
    }

    // --- (FIX 5 - NEW FIX) ---
    // Added this event listener for the details modal's close button.
    // This was the missing piece.
    if (detailsModal && detailsModalCloseBtn) {
        detailsModalCloseBtn.addEventListener('click', () => {
            detailsModal.style.display = 'none';
        });
    }
    // --- (END OF FIX 5) ---


    // --- ADMIN DASHBOARD ---
    const adminIssuesTbody = document.querySelector('#admin-issues-tbody');
    const statusFilter = document.querySelector('#status-filter');
    const searchInput = document.querySelector('#search-input');
    const adminModal = document.querySelector('#admin-modal');
    const adminModalDetails = document.querySelector('#modal-details');
    const adminCloseButton = adminModal ? adminModal.querySelector('.close-button') : null;
    let currentEditingIssueId = null;

    const resolveModal = document.querySelector('#resolve-modal');
    const resolveModalCloseBtn = resolveModal ? resolveModal.querySelector('.close-button') : null;
    const resolveForm = document.querySelector('#resolve-form');

    async function fetchAllIssues() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = 'block';
        if (!adminIssuesTbody) { 
            if (spinner) spinner.style.display = 'none';
            return;
        }
        
        adminIssuesTbody.innerHTML = '';
        const selectedStatus = statusFilter.value;
        const searchTerm = searchInput.value;
        
        let query = adminClient.from('issues').select('*, profiles(full_name)');
        if (selectedStatus !== 'all') { query = query.eq('status', selectedStatus); }
        if (searchTerm) { query = query.ilike('title', `%${searchTerm}%`); }
        
        const { data: issues, error } = await query.order('created_at', { ascending: false });
        if (spinner) spinner.style.display = 'none';
        if (error) { console.error('Error fetching all issues:', error); return; }

        const statsTotalEl = document.getElementById('stats-total');
        const statsProgressEl = document.getElementById('stats-progress');
        const statsResolvedEl = document.getElementById('stats-resolved');
        if (statsTotalEl) statsTotalEl.innerText = issues.length;
        if (statsProgressEl) statsProgressEl.innerText = issues.filter(i => i.status === 'In Progress').length;
        if (statsResolvedEl) statsResolvedEl.innerText = issues.filter(i => i.status === 'Resolved').length;

        issues.forEach(issue => {
            const row = `
                <tr>
                    <td>${issue.profiles ? issue.profiles.full_name : 'N/A'}</td>
                    <td>
                        <strong>${issue.title}</strong><br>
                        <small>${issue.category}</small>
                    </td>
                    <td>${new Date(issue.created_at).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${issue.status.toLowerCase().replace(' ', '')}">${issue.status}</span></td>
                    <td><button class="action-btn view-details-btn" data-id="${issue.id}">View Details</button></td>
                </tr>
            `;
            adminIssuesTbody.innerHTML += row;
        });
    }

    async function openAdminModal(issueId) {
        currentEditingIssueId = parseInt(issueId, 10);
        const { data: issue, error } = await adminClient.from('issues').select('*, profiles(full_name)').eq('id', currentEditingIssueId).single();
        if (error) { alert('Error fetching issue details'); return; }
        adminModalDetails.innerHTML = `<h2>${issue.title}</h2><p><strong>Reported by:</strong> ${issue.profiles ? issue.profiles.full_name : 'N/A'}</p><p><strong>Category:</strong> ${issue.category}</p><p><strong>Location:</strong> ${issue.location}</p><p><strong>Description:</strong> ${issue.description}</p>${issue.image_url ? `<img src="${issue.image_url}" alt="Issue Image" class="modal-issue-image">` : ''}`;
        adminModal.style.display = 'block';
    }

    async function updateIssueStatus(newStatus) {
        if (!currentEditingIssueId) {
            console.error('Update failed: currentEditingIssueId is null.');
            return;
        }
        
        const { data, error } = await adminClient
            .from('issues')
            .update({ status: newStatus })
            .eq('id', currentEditingIssueId)
            .select();
        
        if (error) {
            alert('Failed to update status: ' + (error.message || 'Unknown error'));
            console.error('Error updating status:', error);
            return; 
        }
        
        alert('Status updated successfully!');
        adminModal.style.display = 'none';
        fetchAllIssues();
    }

    if (adminIssuesTbody) {
        adminIssuesTbody.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-details-btn')) {
                const issueId = e.target.dataset.id;
                openAdminModal(issueId);
            }
        });

        if(statusFilter) statusFilter.addEventListener('change', fetchAllIssues);
        if(searchInput) searchInput.addEventListener('input', fetchAllIssues);

        const updateProgressBtn = document.querySelector('#update-progress-btn');
        const updateResolvedBtn = document.querySelector('#update-resolved-btn');

        if (updateProgressBtn) {
            updateProgressBtn.addEventListener('click', () => {
                updateIssueStatus('In Progress');
            });
        }

        if (updateResolvedBtn) {
            updateResolvedBtn.addEventListener('click', () => {
                adminModal.style.display = 'none';
                resolveModal.style.display = 'block';
            });
        }

        if (adminCloseButton) {
            adminCloseButton.addEventListener('click', () => adminModal.style.display = 'none');
        }

        if (resolveModalCloseBtn) {
            resolveModalCloseBtn.addEventListener('click', () => {
                resolveModal.style.display = 'none';
                resolveForm.reset();
            });
        }

        if (resolveForm) {
            resolveForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitButton = document.querySelector('#confirm-resolution-btn');
                submitButton.disabled = true;
                submitButton.innerText = 'Uploading...';

                const imageFile = document.querySelector('#resolve-image').files[0];
                const resolvedName = document.querySelector('#resolve-name').value;
                const resolvedContact = document.querySelector('#resolve-contact').value;
                
                if (!imageFile) {
                    alert('You must upload a resolution image.');
                    submitButton.disabled = false;
                    submitButton.innerText = 'Confirm & Resolve';
                    return;
                }

                const fileName = `${currentEditingIssueId}/${Date.now()}-${imageFile.name}`;
                const { error: uploadError } = await adminClient.storage
                    .from('resolved_images')
                    .upload(fileName, imageFile);

                if (uploadError) {
                    alert('Error uploading image: ' + uploadError.message);
                    submitButton.disabled = false;
                    submitButton.innerText = 'Confirm & Resolve';
                    return;
                }

                const { data: urlData } = adminClient.storage
                    .from('resolved_images')
                    .getPublicUrl(fileName);
                
                const publicUrl = urlData.publicUrl;

                const { data, error: updateError } = await adminClient
                    .from('issues')
                    .update({ 
                        status: 'Resolved',
                        resolved_image_url: publicUrl,
                        resolved_by_name: resolvedName,
                        resolved_by_contact: resolvedContact
                    })
                    .eq('id', currentEditingIssueId)
                    .select();

                if (updateError) {
                    // --- (THIS IS THE SECOND FIX from the original file) ---
                    alert('Error updating issue: ' + updateError.message);
                    submitButton.disabled = false;
                    submitButton.innerText = 'Confirm & Resolve';
                    return;
                }

                alert('Issue successfully resolved and proof uploaded!');
                resolveModal.style.display = 'none';
                resolveForm.reset();
                fetchAllIssues(); 

                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirm & Resolve';
            });
        }
    }

    // --- (THIS IS THE CORRECT PAGE LOAD LOGIC) ---
    const currentPagePath = window.location.pathname;

    if (currentPagePath.includes('dashboard.html')) {
        // 1. Check if the user is logged in.
        // 2. checkUser() will then call fetchUserData(), setupRealtimeListener(),
        //    and initializeAndLoadMap()
        checkUser();
    } else if (currentPagePath.includes('admin.html')) {
        fetchAllIssues();
    }

    // --- (FIX 4) ---
    // This is the map logic, moved from the bottom of the file
    // and wrapped in a reusable function.
    async function initializeAndLoadMap() {
        const issueMapEl = document.getElementById("issue-map");
        if (!issueMapEl) return; // No map element on this page

        // 1. Initialize map (if it doesn't exist)
        if (!issueMapInstance) {
            issueMapInstance = L.map("issue-map").setView([20.5937, 78.9629], 5); // Center on India
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            }).addTo(issueMapInstance);
            issueMapLayerGroup = L.layerGroup().addTo(issueMapInstance);
        }

        // 2. Clear old markers
        issueMapLayerGroup.clearLayers();

        // 3. Fetch all issues (user can see all issues on the map)
        const { data: issues, error } = await client.from("issues").select("*");
        if (error) {
            console.error("Supabase fetch error for map:", error.message);
            return;
        }

        // 4. Add new markers
        if (issues && issues.length > 0) {
            const markers = [];
            issues.forEach((issue) => {
                if (!issue.latitude || !issue.longitude) return; // Skip if missing coords

                const color =
                issue.status === "In Progress"
                    ? "orange"
                    : issue.status === "Resolved"
                    ? "green"
                    : "red";

                const marker = L.circleMarker([issue.latitude, issue.longitude], {
                color,
                radius: 8,
                fillOpacity: 0.8,
                });

                marker.bindPopup(
                `<strong>${issue.title}</strong><br>
                Category: ${issue.category}<br>
                Status: <b>${issue.status}</b><br>
                Location: ${issue.location}`
                );
                
                markers.push(marker);
                issueMapLayerGroup.addLayer(marker);
            });

            // 5. Optional: auto-fit map to all markers
            // We create a new feature group just for fitting bounds
            if (markers.length > 0) {
                const fitGroup = L.featureGroup(markers);
                issueMapInstance.fitBounds(fitGroup.getBounds().pad(0.2));
            }
        }
    }


}); // --- End of DOMContentLoaded listener

// ====================== LOGOUT FUNCTION ======================
// This was in a separate DOM listener, let's add it to the main one
// for good practice, but it's fine here too.
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector(".logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      try {
        // --- This line was wrong, it should be 'client' not 'supabase'
        const { error } = await client.auth.signOut();
        if (error) throw error;

        // ✅ Redirect to login page
        window.location.href = "login.html";
      } catch (err) {
        console.error("Logout failed:", err.message);
        // fallback redirect
        window.location.href = "login.html";
      }
    });
  }
});