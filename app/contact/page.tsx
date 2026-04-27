'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      // Send message to admin dashboard
      const response = await fetch('/api/admin/chat-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          userName: formData.name,
          userEmail: formData.email,
          subject: formData.subject,
          message: formData.message,
          hasText: true,
          hasImage: false
        })
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({ name: '', email: '', subject: '', message: '' });
        }, 3000);
        console.log('[v0] Message sent successfully');
      } else {
        console.error('[v0] Failed to send message:', response.status);
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({ name: '', email: '', subject: '', message: '' });
        }, 3000);
      }
    } catch (error) {
      console.error('[v0] Error sending message:', error);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: '', email: '', subject: '', message: '' });
      }, 3000);
    }
  };

  return (
    <main className='min-h-screen bg-background'>
      <Header />

      {/* Hero */}
      <section className='pt-32 pb-12 px-4 max-w-7xl mx-auto'>
        <div className='text-center'>
          <h1 className='text-4xl md:text-5xl font-bold text-foreground mb-4'>Get In Touch</h1>
          <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
            Have questions? We&apos;d love to hear from you. Contact our support team anytime.
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className='py-16 px-4 max-w-7xl mx-auto'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mb-16'>
          {[
            {
              icon: Mail,
              title: 'Email',
              content: 'support@powabitz.com',
              desc: 'We reply within 24 hours'
            },
            {
              icon: Phone,
              title: 'Phone',
              content: '+1 (234) 567-890',
              desc: 'Available 24/7'
            },
            {
              icon: MapPin,
              title: 'Location',
              content: 'Global Platform',
              desc: 'Operating worldwide'
            }
          ].map((contact, idx) => {
            const Icon = contact.icon;
            return (
              <div key={idx} className='p-8 rounded-lg border border-border text-center hover:border-primary transition-all'>
                <Icon className='mx-auto text-primary mb-4' size={32} />
                <h3 className='font-bold text-foreground mb-2'>{contact.title}</h3>
                <p className='font-semibold text-foreground mb-1'>{contact.content}</p>
                <p className='text-muted-foreground text-sm'>{contact.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Contact Form */}
        <div className='max-w-2xl mx-auto'>
          <div className='p-12 rounded-xl border border-border bg-card/50'>
            <h2 className='text-2xl font-bold text-foreground mb-8'>Send us a Message</h2>

            {submitted ? (
              <div className='p-6 rounded-lg bg-green-500/10 border border-green-500 text-center'>
                <p className='text-green-500 font-semibold'>Thank you for your message!</p>
                <p className='text-muted-foreground mt-2'>We&apos;ll get back to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className='space-y-6'>
                <div>
                  <label className='block text-foreground font-semibold mb-2'>Your Name</label>
                  <input
                    type='text'
                    name='name'
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className='w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                    placeholder='John Doe'
                  />
                </div>

                <div>
                  <label className='block text-foreground font-semibold mb-2'>Your Email</label>
                  <input
                    type='email'
                    name='email'
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className='w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                    placeholder='john@example.com'
                  />
                </div>

                <div>
                  <label className='block text-foreground font-semibold mb-2'>Subject</label>
                  <select
                    name='subject'
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className='w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                  >
                    <option value=''>Select a subject</option>
                    <option value='support'>Technical Support</option>
                    <option value='investment'>Investment Question</option>
                    <option value='kyc'>KYC Verification</option>
                    <option value='withdrawal'>Withdrawal Issue</option>
                    <option value='general'>General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className='block text-foreground font-semibold mb-2'>Message</label>
                  <textarea
                    name='message'
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className='w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none'
                    placeholder='Tell us how we can help you...'
                  ></textarea>
                </div>

                <button
                  type='submit'
                  className='w-full py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group'
                >
                  Send Message
                  <Send className='group-hover:translate-x-1 transition-transform' size={20} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className='py-16 px-4 bg-card/50 max-w-7xl mx-auto'>
        <h2 className='text-2xl font-bold text-foreground mb-8 text-center'>Frequently Asked Questions</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto'>
          {[
            {
              q: 'How long does it take to verify my account?',
              a: 'Email verification takes 5 minutes. KYC verification for amounts above $300 takes 1-2 business days.'
            },
            {
              q: 'What are the withdrawal fees?',
              a: 'We charge only the blockchain network fee. No additional platform fees.'
            },
            {
              q: 'Can I cancel my investment?',
              a: 'You can request withdrawal anytime, but your initial investment must be locked for the first 7 days.'
            },
            {
              q: 'Is there a referral program?',
              a: 'Yes, refer friends and earn bonuses on their investments. Contact support for details.'
            },
            {
              q: 'What cryptocurrencies do you accept?',
              a: 'We accept Bitcoin, Ethereum, USDT, Litecoin, Dogecoin, and more.'
            },
            {
              q: 'How do I contact support?',
              a: 'Email support@powabitz.com or use the contact form above. We respond within 24 hours.'
            }
          ].map((item, idx) => (
            <div key={idx} className='p-6 rounded-lg border border-border'>
              <h3 className='font-bold text-foreground mb-2'>{item.q}</h3>
              <p className='text-muted-foreground text-sm'>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
