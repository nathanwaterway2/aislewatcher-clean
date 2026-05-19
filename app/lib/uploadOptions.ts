export const POPULAR_CATEGORIES = [
  'Hot Wheels',
  'Pokemon',
  'Pokemon Cards',
  'Sports Cards',
  'Magic Cards',
  'Funko Pops',
  'Action Figures',
  'LEGO',
  'Video Games',
  'Sneakers',
  'Perfume',
]

export const UPLOAD_CATEGORIES = [
  ...POPULAR_CATEGORIES,
  'Matchbox',
  'Diecast Cars',
  'Yu-Gi-Oh Cards',
  'One Piece Cards',
  'Lorcana Cards',
  'Anime Figures',
  'RC Cars',
  'Game Consoles',
  'Watches',
  'Jewelry',
  'Books',
  'Manga',
  'Comics',
  'Board Games',
  'Puzzles',
  'Plushies',
  'Squishmallows',
  'Nerf',
  'Clearance Finds',
  'Laptops',
  'Electronics',
  'Headphones',
  'Makeup',
  'Skincare',
  'Live Bait',
  'Camping Gear',
  'Hunting Gear',
  'Outdoor Gear',
  'Tools',
  'Automotive',
  'Seasonal Items',
  'Summer Items',
  'Halloween Items',
  'Christmas Items',
  "Valentine's Items",
  'Easter Items',
  'Back To School',
  'Restock Carts',
  'Toy Aisle',
  'Baby Items',
  'Home Goods',
  'Office Supplies',
  'Sporting Goods',
]

export const DEFAULT_CATEGORY = 'Hot Wheels'

export const UPLOAD_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export const STOCK_LEVEL_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'low', label: 'Low' },
  { value: 'limited', label: 'Limited' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'full', label: 'Full' },
  { value: 'overflowing', label: 'Overflowing' },
]

export const DEFAULT_STOCK_LEVEL = 'moderate'

export const FIND_QUALITY_OPTIONS = [
  { value: 'Nothing Special', label: 'Nothing Special' },
  { value: 'Some Good Stuff', label: 'Some Good Stuff' },
  { value: 'hits', label: 'Hits' },
]

export const DEFAULT_FIND_QUALITY = 'Nothing Special'

export function withCurrentStringOption(
  options: string[],
  currentValue?: string | null
) {
  if (
    currentValue &&
    !options.some((option) => option === currentValue)
  ) {
    return [currentValue, ...options]
  }

  return options
}

export function withCurrentSelectOption(
  options: { value: string; label: string }[],
  currentValue?: string | null
) {
  if (
    currentValue &&
    !options.some((option) => option.value === currentValue)
  ) {
    return [
      {
        value: currentValue,
        label: currentValue,
      },
      ...options,
    ]
  }

  return options
}
