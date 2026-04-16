const permit = (allowedRoles = []) => {
    return (req, res, next) => {
        // BYPASS AUTHORIZATION FOR NOW
        return next();

        /* Lógica original comentada
        if (!req.user || !req.user.rolNormalizado) {
            return res.status(403).json({ error: 'Usuario sin rol válido' });
        }

        const userRole = req.user.rolNormalizado;

        // Gerente y Adminproy tienen acceso a todo (superadmins)
        if (userRole === 'gerente' || userRole === 'adminproy') {
            return next();
        }

        // Si su rol está en la lista de roles permitidos, pasa
        if (allowedRoles.includes(userRole)) {
            return next();
        }

        return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
        */
    };
};

module.exports = { permit };
