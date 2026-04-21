
# 📍 Civic Issue Reporter

A **web-based civic issue reporting system** that allows citizens to report local problems with images, track their status in real time, and enables administrators to efficiently manage and resolve these issues.

---

## 🚀 Features

### 👤 User Side

* Submit civic issues with images and details
* View all reported issues
* Track issue status (Pending / In Progress / Resolved)
* Simple and user-friendly dashboard

### 🛠️ Admin Side

* Secure admin login
* View all reported issues
* Access issue details (image, description, etc.)
* Update issue status
* Real-time dashboard updates

---

## 🏗️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend & Database:** Supabase
* **Storage:** Supabase Storage (for images)

---

## 📊 Workflow Overview

### User Flow

1. User logs in / opens dashboard
2. Submits issue with image
3. Issue stored in database
4. User receives confirmation
5. User can track status anytime

### Admin Flow

1. Admin logs in
2. Views all reported issues
3. Selects an issue
4. Updates status
5. Dashboard reflects changes

---

## 📁 Project Structure

```
/project-root
│── index.html
│── style.css
│── script.js
│── /assets
│── /images
│── README.md
```

---

## ⚙️ Setup Instructions

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/civic-issue-reporter.git
   ```

2. Open the project folder:

   ```bash
   cd civic-issue-reporter
   ```

3. Configure Supabase:

   * Create a Supabase project
   * Set up:

     * `issues` table
     * Storage bucket for images
   * Add your API keys in `script.js`

4. Run the project:

   * Open `index.html` in your browser

---

## 🧠 Future Improvements

* User authentication system
* Location-based issue mapping
* Push notifications
* Mobile app integration
* Analytics dashboard for admins

---

## 🤝 Contribution

Contributions are welcome!
Feel free to fork the repo and submit a pull request.

---

## 📄 License

This project is open-source and available under the **MIT License**.

---

## 📬 Contact

For any queries or suggestions, feel free to reach out.


