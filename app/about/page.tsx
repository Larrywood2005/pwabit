import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Award, Users, Globe, Shield } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className='min-h-screen bg-background'>
      <Header />

      {/* Hero */}
      <section className='pt-32 pb-12 px-4 max-w-7xl mx-auto'>
        <div className='text-center'>
          <h1 className='text-4xl md:text-5xl font-bold text-foreground mb-4'>About Powabitz</h1>
          <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
            Democratizing crypto investment with transparent, secure, and profitable opportunities for everyone.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className='py-16 px-4 max-w-7xl mx-auto'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
          <div>
            <h2 className='text-3xl font-bold text-foreground mb-4'>Our Mission</h2>
            <p className='text-muted-foreground mb-4'>
              Powabitz is a UK-regulated financial technology platform dedicated to democratizing access to sophisticated crypto investment opportunities. Operating under FCA supervision and incorporated as a private limited company in England and Wales, we provide institutional-grade trading infrastructure to retail investors worldwide.
            </p>
            <p className='text-muted-foreground mb-4'>
              Our mission is to deliver transparent, secure, and compliant investment solutions through blockchain technology and advanced security protocols. We maintain rigorous compliance standards including full KYC verification, AML procedures, and regular security audits to ensure every transaction is verified, transparent, and protected.
            </p>
            <p className='text-muted-foreground'>
              Since our establishment in 2024, Powabitz has grown to serve over 10,000 active investors globally, managing more than $50 million in investments. We are committed to fostering trust through regulatory compliance, operational excellence, and unwavering dedication to investor protection.
            </p>
          </div>
          <div className='space-y-4'>
            {/* Compliance badges */}
            <div className='p-4 rounded-lg bg-card border border-border flex items-center justify-center'>
              <div className='text-center'>
                <img 
                  src='https://hebbkx1anhila5yf.public.blob.vercel-storage.com/FCA%20UK%20REG-tpIiSMW9vGr4R1MXDho9irjldhw2ht.jpg'
                  alt='FCA UK Registration'
                  className='w-32 h-auto mx-auto rounded shadow'
                />
                <p className='text-xs text-muted-foreground mt-2 font-semibold'>FCA Regulated</p>
              </div>
            </div>

            <div className='p-6 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900'>
              <p className='text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2'>Regulatory Status</p>
              <ul className='text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1'>
                <li>✓ FCA Supervised Entity</li>
                <li>✓ UK Companies House Registration</li>
                <li>✓ Full KYC/AML Compliant</li>
                <li>✓ Regular Security Audits</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className='py-16 px-4 bg-card/50 max-w-7xl mx-auto'>
        <h2 className='text-3xl font-bold text-foreground mb-12 text-center'>Our Core Values</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
          {[
            { icon: Shield, title: 'Security', desc: 'Your funds are protected with enterprise-grade security' },
            { icon: Award, title: 'Transparency', desc: 'Every transaction is verifiable and tracked' },
            { icon: Users, title: 'Community', desc: 'We believe in building trust with our investors' },
            { icon: Globe, title: 'Accessibility', desc: 'Financial opportunity for everyone, anywhere' }
          ].map((value, idx) => {
            const Icon = value.icon;
            return (
              <div key={idx} className='p-6 rounded-lg bg-card border border-border text-center'>
                <Icon className='mx-auto text-primary mb-4' size={32} />
                <h3 className='font-bold text-foreground mb-2'>{value.title}</h3>
                <p className='text-muted-foreground text-sm'>{value.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Team */}
      <section className='py-16 px-4 max-w-7xl mx-auto'>
        <h2 className='text-3xl font-bold text-foreground mb-12 text-center'>Leadership Team</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto'>
          {/* CEO/Founder */}
          <div className='p-6 rounded-lg border border-border text-center'>
            <img 
              src='https://hebbkx1anhila5yf.public.blob.vercel-storage.com/download%20%289%29.jfif-cn5GPKVAzmuqg7oXUloqF1cQOKYYVz.jpeg'
              alt='CEO & Founder'
              className='w-24 h-24 rounded-full object-cover mx-auto mb-4 ring-2 ring-primary'
            />
            <h3 className='font-bold text-foreground mb-1 text-lg'>Mark Johnson</h3>
            <p className='text-primary text-sm font-semibold mb-2'>CEO & Founder</p>
            <p className='text-muted-foreground text-sm'>Crypto investor with 10+ years experience in blockchain technology and digital finance.</p>
          </div>

          {/* CTO */}
          <div className='p-6 rounded-lg border border-border text-center'>
            <img 
              src='https://hebbkx1anhila5yf.public.blob.vercel-storage.com/download%20%2810%29.jfif-OmxbZXMPvyidz1QvM85vBlrai3DuLO.jpeg'
              alt='CTO'
              className='w-24 h-24 rounded-full object-cover mx-auto mb-4 ring-2 ring-secondary'
            />
            <h3 className='font-bold text-foreground mb-1 text-lg'>Sarah Chen</h3>
            <p className='text-secondary text-sm font-semibold mb-2'>Chief Technology Officer</p>
            <p className='text-muted-foreground text-sm'>Blockchain engineer and security specialist with expertise in smart contracts and cryptography.</p>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className='py-16 px-4 max-w-7xl mx-auto'>
        <div className='p-12 rounded-xl border border-border bg-card/50'>
          <h2 className='text-2xl font-bold text-foreground mb-4'>Compliance & Security</h2>
          <p className='text-muted-foreground mb-6'>
            As an FCA-regulated entity incorporated in the United Kingdom, Powabitz operates with the highest standards of compliance and security. Our regulatory framework ensures investor protection and operational transparency at every level.
          </p>
          <ul className='space-y-3 text-muted-foreground'>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              <span><strong>FCA Supervision:</strong> Operating under Financial Conduct Authority oversight as a UK-regulated financial services entity</span>
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              <span><strong>UK Incorporation:</strong> Registered as a Private Limited Company with Companies House under UK jurisdiction</span>
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              Full KYC (Know Your Customer) verification and ongoing customer due diligence
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              AML (Anti-Money Laundering) compliance and transaction monitoring
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              Regular security audits, penetration testing, and vulnerability assessments
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              Cold storage for the majority of user funds with multi-signature security
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              24/7 monitoring, fraud detection, and incident response protocols
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              Quarterly compliance reporting and regulatory filings
            </li>
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  );
}
