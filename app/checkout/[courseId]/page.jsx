'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function CheckoutPage({ params }) {
  const [success, setSuccess] = useState(false);

  const handlePurchase = () => {
    // Simulate API request
    setTimeout(() => setSuccess(true), 1000);
  };

  return (
    <main className="layout-container" style={{ padding: '60px 24px', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '40px' }}>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#34c759', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 24px' }}>
              ✓
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '16px' }}>Purchase Successful!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
              You have successfully enrolled in the course. It is now available in your dashboard.
            </p>
            <Link href="/dashboard" className="btn-primary" style={{ width: '100%' }}>
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '8px' }}>Course Enrollment</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Review your order details below.</p>
            
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: 500 }}>Course ID</span>
                <span style={{ color: 'var(--text-secondary)' }}>{params.courseId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                <span style={{ fontWeight: 600 }}>Total Price</span>
                <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>$99.00 USD</span>
              </div>
            </div>

            <button onClick={handlePurchase} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}>
              Confirm Payment
            </button>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link href="/courses" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Cancel and return to courses
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
