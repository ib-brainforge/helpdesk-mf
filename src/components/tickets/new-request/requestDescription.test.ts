import { describe, expect, it } from 'vitest';
import { requestDescription } from './requestDescription';

describe('requestDescription', () => {
  it("leads with the requester's words, then the contact, escaped", () => {
    const html = requestDescription('Truck <12> stopped\n\nSince Monday', {
      name: 'Sam',
      phone: '0400 000 000',
      location: 'Dandenong depot',
    });
    expect(html).toBe(
      '<p>Truck &lt;12&gt; stopped</p><p>Since Monday</p>' +
        '<p><strong>Contact</strong></p><ul>' +
        '<li><strong>Contact:</strong> Sam</li>' +
        '<li><strong>Phone:</strong> 0400 000 000</li>' +
        '<li><strong>Location:</strong> Dandenong depot</li></ul>',
    );
  });

  it('is empty with nothing to say', () => {
    expect(requestDescription('  ', { phone: ' ' })).toBe('');
  });
});
