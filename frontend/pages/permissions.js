import Permissions from '../components/Permissions'
import PleaseSignIn from '../components/PleaseSignin'

const PermissionsPage = props => (
    <div>
        <PleaseSignIn>
            <Permissions />
        </PleaseSignIn>
    </div>
)

export default PermissionsPage
