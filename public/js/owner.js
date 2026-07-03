const owner = {
  setupProfileForm: async () => {
    const nameInput = document.getElementById('profName');
    const emailInput = document.getElementById('profEmail');
    const imgAvatar = document.getElementById('profile-avatar-large');

    if (!nameInput) return;

    try {
      const res = await api.get('/owner/profile');
      if (res && res.success) {
        nameInput.value = res.data.name;
        emailInput.value = res.data.email;
        if (imgAvatar && res.data.profilePic) {
          imgAvatar.src = res.data.profilePic;
        }
      }
    } catch (err) {
      showToast('Failed to load profile details.', 'danger');
    }

    const form = document.getElementById('owner-profile-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('profName').value.trim();
        const password = document.getElementById('profPassword').value;
        const fileInput = document.getElementById('profPic');

        const formData = new FormData();
        if (name) formData.append('name', name);
        if (password) formData.append('password', password);
        if (fileInput && fileInput.files[0]) {
          formData.append('profilePic', fileInput.files[0]);
        }

        try {
          const res = await api.putMultipart('/owner/profile', formData);
          if (res && res.success) {
            // Update cached user details
            const cachedUser = api.getUser();
            api.setUser({
              ...cachedUser,
              name: res.data.name,
              profilePic: res.data.profilePic
            });

            showToast('Profile settings updated successfully!', 'success');
            setTimeout(() => window.location.reload(), 800);
          }
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });
    }
  }
};
