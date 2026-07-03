// lib/ContactInfo.js — the MongoDB "shape" of the Contact page's editable
// content. Unlike Product/Testimonial this is a SINGLETON: there is only
// ever one ContactInfo document, holding whatever currently shows on the
// public Contact page (address, phone, email, delivery note, WhatsApp
// details and the Google Maps embed link).
//
// There's no "delete" action for this in the admin panel — only edit/save
// — so, unlike products/testimonials, it's safe for the API to create one
// with sensible defaults the first time it's read if it doesn't exist yet.

import mongoose from 'mongoose';

const contactInfoSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      default: 'Rural Industrial Cluster, Near Haldwani,\nNainital District, Uttarakhand — 263139',
    },
    phone: { type: String, default: '+91 89234 29380' },
    hours: { type: String, default: 'Mon–Sat · 9 AM – 7 PM' },
    email: { type: String, default: 'orders@himshakti.in' },
    delivery: {
      type: String,
      default: 'Pan India · 3–6 working days\nFree shipping above ₹499',
    },
    whatsappNumber: { type: String, default: '918923429380' },
    whatsappMessage: {
      type: String,
      default: 'Namaste! I would like to visit or pickup an order.',
    },
    mapEmbedUrl: {
      type: String,
      default:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d27860.52405115781!2d79.47060204430429!3d29.206916343992823!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39a09addbd0c86d1%3A0x6793e360cb3d930f!2sHaldwani%2C%20Uttarakhand%20263139!5e0!3m2!1sen!2sin!4v1781445052713!5m2!1sen!2sin',
    },
  },
  { timestamps: true }
);

export default mongoose.models.ContactInfo || mongoose.model('ContactInfo', contactInfoSchema);
