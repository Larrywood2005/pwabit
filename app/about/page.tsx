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
              At Powabitz, we believe everyone should have access to profitable crypto investment opportunities. 
              Our mission is to provide a transparent, secure, and user-friendly platform where investors of all 
              levels can grow their wealth through daily compound returns.
            </p>
            <p className='text-muted-foreground mb-4'>
              We leverage blockchain technology and advanced security protocols to ensure every transaction is 
              verified and transparent. Our commitment to security and customer satisfaction is unwavering.
            </p>
            <p className='text-muted-foreground'>
              Founded in 2024, Powabitz has grown to serve over 10,000 active investors worldwide, managing 
              more than $20 million in investments.
            </p>
          </div>
          <div className='p-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-border'>
            <div className='text-center'>
              <div className='text-5xl font-bold text-primary mb-2'>5K+</div>
              <p className='text-muted-foreground mb-8'>Active Investors</p>
              
              <div className='text-5xl font-bold text-secondary mb-2'>$20M+</div>
              <p className='text-muted-foreground mb-8'>Total Invested</p>
              
              <div className='text-5xl font-bold text-accent mb-2'>3%</div>
              <p className='text-muted-foreground'>Daily Returns</p>
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

      {/* Team (Placeholder) */}
      <section className='py-16 px-4 max-w-7xl mx-auto'>
        <h2 className='text-3xl font-bold text-foreground mb-12 text-center'>Leadership Team</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {[
            { name: 'John Smith', role: 'CEO & Founder', bio: 'Crypto investor with 10+ years experience' },
            { name: 'Sarah Johnson', role: 'CTO', bio: 'Blockchain engineer and security specialist' },
            { name: 'Mike Chen', role: 'CFO', bio: 'Financial advisor with 15+ years in crypto' }
          ].map((member, idx) => (
            <div key={idx} className='p-6 rounded-lg border border-border text-center'>
              <div className='w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4'></div>
              <h3 className='font-bold text-foreground mb-1'>{member.name}</h3>
              <p className='text-primary text-sm font-semibold mb-2'>{member.role}</p>
              <p className='text-muted-foreground text-sm'>{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section className='py-16 px-4 max-w-7xl mx-auto'>
        <div className='p-12 rounded-xl border border-border bg-card/50'>
          <h2 className='text-2xl font-bold text-foreground mb-4'>Compliance & Security</h2>
          <p className='text-muted-foreground mb-6'>
            Powabitz operates with the highest standards of compliance and security. We are committed to:
          </p>
          <ul className='space-y-3 text-muted-foreground'>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              Full KYC (Know Your Customer) verification for users
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              AML (Anti-Money Laundering) compliance
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              Regular security audits and penetration testing
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              Cold storage for the majority of user funds
            </li>
            <li className='flex items-start gap-3'>
              <span className='text-primary mt-1'>✓</span>
              24/7 monitoring and fraud detection
            </li>
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  );
}
