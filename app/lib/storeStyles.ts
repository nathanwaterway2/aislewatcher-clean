export function getStoreColor(store: string) {

  const value = (store || '').toLowerCase()

  // WALMART
  if (value.includes('walmart')) {
    return {
      text: 'text-blue-400',
      badge: 'bg-blue-900/40 text-blue-300',
      border: 'border-blue-700'
    }
  }

// CVS
	if (
	  value.includes('cvs') ||
	  value.includes('cvs pharmacy')
	) {
	  return {
		text: 'text-[#CC0000]',
		badge: 'bg-[#CC0000]/20 text-[#FF6B6B]',
		border: 'border-[#CC0000]'
	  }
	}

	// TARGET
	if (value.includes('target')) {
	  return {
		text: 'text-[#CC0000]',
		badge: 'bg-[#CC0000]/20 text-[#FF4D4D]',
		border: 'border-[#CC0000]'
	  }
	}

// DOLLAR GENERAL
	if (value.includes('dollar general')) {
	  return {
		text: 'text-[#FFF000]',
		badge: 'bg-[#FFF000]/20 text-[#FFF76A]',
		border: 'border-[#FFF000]'
	  }
	}
// DOLLAR TREE
	if (value.includes('dollar tree')) {
	  return {
		text: 'text-[#007F3A]',
		badge: 'bg-[#007F3A]/20 text-[#59BA29]',
		border: 'border-[#007F3A]'
	  }
	}
	// FAMILY DOLLAR
	if (value.includes('family dollar')) {
	  return {
		text: 'text-[#F89D20]',
		badge: 'bg-[#F89D20]/20 text-[#FFB347]',
		border: 'border-[#F89D20]'
	  }
	}

	// WALGREENS
	if (value.includes('walgreens')) {
	  return {
		text: 'text-red-700',
		badge: 'bg-red-950/60 text-red-500',
		border: 'border-red-900'
	  }
	}

  // FAMILY DOLLAR
  if (value.includes('family dollar')) {
    return {
      text: 'text-orange-300',
      badge: 'bg-orange-900/40 text-orange-200',
      border: 'border-orange-700'
    }
  }

  // STOP & SHOP
  if (
    value.includes('stop & shop') ||
    value.includes('stop and shop')
  ) {
    return {
      text: 'text-purple-400',
      badge: 'bg-purple-900/30 text-purple-300',
      border: 'border-purple-700'
    }
  }

  return {
    text: 'text-white',
    badge: 'bg-gray-800 text-gray-300',
    border: 'border-gray-700'
  }
}