const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      // Direct Insert into the EXACT table from your schema
      const { error } = await supabase
        .from('truscan_partner_applications') 
        .insert([
          { 
            name: data.name,      // Matches your 'name' column
            email: data.email,    // Matches your 'email' column
            whatsapp: data.whatsapp, // Matches your 'whatsapp' column
            experience: data.experience, // Matches your 'experience' column
            status: 'pending'     // Default status as per your schema
          }
        ]);

      if (error) throw error;

      // This triggers the "Application Received!" message
      setFormStatus('success');
      
    } catch (err: any) {
      console.error('Database insertion error:', err);
      // If Supabase RLS is blocking it, the error will show here
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
      setFormStatus('error');
    }
  };
