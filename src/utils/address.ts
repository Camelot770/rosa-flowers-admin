interface AddressParts {
  title?: string | null;
  street: string;
  house: string;
  apartment?: string | null;
  entrance?: string | null;
  floor?: string | null;
}

export function formatAddress(a: AddressParts): string {
  // Site orders store "City, street" in title; in the mini-apps title is a label like "Дом"
  const titleHasStreet = !!a.title && (a.title === a.street || a.title.endsWith(`, ${a.street}`));
  const street = titleHasStreet ? a.title : a.street;
  const label = a.title && !titleHasStreet ? `${a.title}: ` : '';
  const parts = [
    `${street}, ${a.house}`,
    a.apartment && `кв. ${a.apartment}`,
    a.entrance && `подъезд ${a.entrance}`,
    a.floor && `этаж ${a.floor}`,
  ];
  return label + parts.filter(Boolean).join(', ');
}
