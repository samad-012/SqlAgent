import Link from 'next/link'
export default function Navbar() {
  return (
    <div className='flex items-center justify-between p-4 border-b rounded-lg shadow-md'>
      <h1 className='text-blue-300 text-left font-bold drop-shadow-2xl text-3xl'>
        SQL Agent
      </h1>
      <div className='flex'>
        <Link href='/' aria-label='Home'>
          <h2 className='flex p-4 text-blue-300 hover:text-white cursor-pointer'>
            Home
          </h2>
        </Link>
        <Link href='/docs' aria-label='Documentation'>
          <h2
            className='p-4 text-blue-300 hover:text-white cursor-pointer'
            onClick={() => window.open('/miniii.pptx', '_blank')}
          >
            Docs
          </h2>
        </Link>
        <Link href='/contact' aria-label='Contact'>
          <h2 className='p-4 text-blue-300 hover:text-white cursor-pointer'>
            Contact
          </h2>
        </Link>
      </div>
    </div>
  )
}