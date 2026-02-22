import nodemailer from "nodemailer";

/**
 * Send abandoned cart recovery email
 */
export async function sendAbandonedCartEmail(shop, cart, settings) {
  if (!settings.smtpHost || !settings.emailFrom || !cart.customerEmail) {
    throw new Error("Email configuration incomplete");
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });

  const lineItems = JSON.parse(cart.lineItems || "[]");

  const productListHTML = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
          ${item.title || "Προϊόν"}
          ${item.variant_title ? `<br><small style="color:#888">${item.variant_title}</small>` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align:center;">x${item.quantity || 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align:right; font-weight:600;">
          ${parseFloat(item.price || 0).toFixed(2)} ${cart.currency}
        </td>
      </tr>
    `
    )
    .join("");

  const emailBody =
    settings.emailBody ||
    `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px;">
          Ξεχάσατε κάτι; 🛒
        </h1>
        <p style="color: rgba(255,255,255,0.7); margin: 10px 0 0; font-size: 15px;">
          Το καλάθι σας σας περιμένει!
        </p>
      </div>
      
      <!-- Body -->
      <div style="padding: 40px 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Γεια σας! Παρατηρήσαμε ότι αφήσατε κάποια προϊόντα στο καλάθι σας.
          Μην ανησυχείτε — τα κρατήσαμε για εσάς!
        </p>
        
        <!-- Products table -->
        <table style="width: 100%; border-collapse: collapse; margin: 25px 0; background: #fafafa; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="padding: 12px; text-align:left; font-size:13px; color:#666; font-weight:600;">ΠΡΟΪΟΝ</th>
              <th style="padding: 12px; text-align:center; font-size:13px; color:#666; font-weight:600;">ΠΟΣ.</th>
              <th style="padding: 12px; text-align:right; font-size:13px; color:#666; font-weight:600;">ΤΙΜΗ</th>
            </tr>
          </thead>
          <tbody>
            ${productListHTML}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 15px 12px; font-weight: 700; font-size: 15px;">Σύνολο</td>
              <td style="padding: 15px 12px; text-align:right; font-weight: 700; font-size: 18px; color: #1a1a2e;">
                ${cart.totalPrice.toFixed(2)} ${cart.currency}
              </td>
            </tr>
          </tfoot>
        </table>
        
        <!-- CTA -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://${shop}/checkout" 
             style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; 
                    padding: 16px 45px; border-radius: 50px; text-decoration: none; 
                    font-size: 16px; font-weight: 600; display: inline-block; letter-spacing: 0.5px;
                    box-shadow: 0 8px 25px rgba(102,126,234,0.4);">
            Ολοκλήρωση Παραγγελίας →
          </a>
        </div>
        
        <p style="color: #999; font-size: 13px; text-align: center; margin-top: 30px;">
          Εάν δεν θέλετε να λαμβάνετε τέτοια email, παρακαλούμε
          <a href="#" style="color: #667eea;">καταργήστε την εγγραφή σας</a>.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">
          ${shop} • Αποστολή μέσω Cart Tracker App
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: settings.emailFrom,
    to: cart.customerEmail,
    subject: settings.emailSubject || "Ξεχάσατε κάτι στο καλάθι σας; 🛒",
    html: emailBody,
  });

  console.log(`✅ Recovery email sent to ${cart.customerEmail} for cart ${cart.cartToken}`);
}
